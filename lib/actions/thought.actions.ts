"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Thought from "../models/thought.model";
import Community from "../models/community.model";

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level thoughts) (a thought that is not a comment/reply).
  const postsQuery = Thought.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "community",
      model: Community,
    })
    .populate({
      path: "children", // Populate the children field
      populate: {
        path: "author", // Populate the author field within children
        model: User,
        select: "_id name parentId image", // Select only _id and username fields of the author
      },
    });

  // Count the total number of top-level posts (thoughts) i.e., thoughts that are not comments.
  const totalPostsCount = await Thought.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

interface Params {
  text: string,
  author: string,
  communityId: string | null,
  path: string,
}

export async function createThought({ text, author, communityId, path }: Params
) {
  try {
    connectToDB();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdThought = await Thought.create({
      text,
      author,
      community: communityIdObject, // Assign communityId if provided, or leave it null for personal account
    });

    // Update User model
    await User.findByIdAndUpdate(author, {
      $push: { thoughts: createdThought._id },
    });

    if (communityIdObject) {
      // Update Community model
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { thoughts: createdThought._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to post thought: ${error.message}`);
  }
}

async function fetchAllChildThoughts(thoughtId: string): Promise<any[]> {
  const childThoughts = await Thought.find({ parentId: thoughtId });

  const descendantThoughts = [];
  for (const childThought of childThoughts) {
    const descendants = await fetchAllChildThoughts(childThought._id);
    descendantThoughts.push(childThought, ...descendants);
  }

  return descendantThoughts;
}

export async function deleteThought(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    // Find the thought to be deleted (the main thought)
    const mainThought = await Thought.findById(id).populate("author community");

    if (!mainThought) {
      throw new Error("Thought not found");
    }

    // Fetch all child thoughts and their descendants recursively
    const descendantThoughts = await fetchAllChildThoughts(id);

    // Get all descendant thought IDs including the main thought ID and child thought IDs
    const descendantThoughtIds = [
      id,
      ...descendantThoughts.map((thought) => thought._id),
    ];

    // Extract the authorIds and communityIds to update User and Community models respectively
    const uniqueAuthorIds = new Set(
      [
        ...descendantThoughts.map((thought) => thought.author?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThought.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantThoughts.map((thought) => thought.community?._id?.toString()), // Use optional chaining to handle possible undefined values
        mainThought.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    // Recursively delete child thoughts and their descendants
    await Thought.deleteMany({ _id: { $in: descendantThoughtIds } });

    // Update User model
    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { thoughts: { $in: descendantThoughtIds } } }
    );

    // Update Community model
    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { thoughts: { $in: descendantThoughtIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete thought: ${error.message}`);
  }
}

export async function fetchThoughtById(thoughtId: string) {
  connectToDB();

  try {
    const thought = await Thought.findById(thoughtId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) // Populate the author field with _id and username
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      }) // Populate the community field with _id and name
      .populate({
        path: "children", // Populate the children field
        populate: [
          {
            path: "author", // Populate the author field within children
            model: User,
            select: "_id id name parentId image", // Select only _id and username fields of the author
          },
          {
            path: "children", // Populate the children field within children
            model: Thought, // The model of the nested children (assuming it's the same "Thought" model)
            populate: {
              path: "author", // Populate the author field within nested children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
          },
        ],
      })
      .exec();

    return thought;
  } catch (err) {
    console.error("Error while fetching thought:", err);
    throw new Error("Unable to fetch thought");
  }
}

export async function addCommentToThought(
  thoughtId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    // Find the original thought by its ID
    const originalThought = await Thought.findById(thoughtId);

    if (!originalThought) {
      throw new Error("Thought not found");
    }

    // Create the new comment thought
    const commentThought = new Thought({
      text: commentText,
      author: userId,
      parentId: thoughtId, // Set the parentId to the original thought's ID
    });

    // Save the comment thought to the database
    const savedCommentThought = await commentThought.save();

    // Add the comment thought's ID to the original thought's children array
    originalThought.children.push(savedCommentThought._id);

    // Save the updated original thought to the database
    await originalThought.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}
