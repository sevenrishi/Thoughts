import { redirect } from "next/navigation";

import { fetchCommunityPosts } from "@/lib/actions/community.actions";
import { fetchUserPosts } from "@/lib/actions/user.actions";

import ThoughtCard from "../cards/ThoughtCard";

interface Result {
  name: string;
  image: string;
  id: string;
  thoughts: {
    _id: string;
    text: string;
    parentId: string | null;
    author: {
      name: string;
      image: string;
      id: string;
    };
    community: {
      id: string;
      name: string;
      image: string;
    } | null;
    createdAt: string;
    children: {
      author: {
        image: string;
      };
    }[];
  }[];
}

interface Props {
  currentUserId: string;
  accountId: string;
  accountType: string;
}

async function ThoughtsTab({ currentUserId, accountId, accountType }: Props) {
  let result: Result;

  if (accountType === "Community") {
    result = await fetchCommunityPosts(accountId);
  } else {
    result = await fetchUserPosts(accountId);
  }

  if (!result) {
    redirect("/");
  }

  return (
    <section className='mt-9 flex flex-col gap-10'>
      {result.thoughts.map((thought) => (
        <ThoughtCard
          key={thought._id}
          id={thought._id}
          currentUserId={currentUserId}
          parentId={thought.parentId}
          content={thought.text}
          author={
            accountType === "User"
              ? { name: result.name, image: result.image, id: result.id }
              : {
                  name: thought.author.name,
                  image: thought.author.image,
                  id: thought.author.id,
                }
          }
          community={
            accountType === "Community"
              ? { name: result.name, id: result.id, image: result.image }
              : thought.community
          }
          createdAt={thought.createdAt}
          comments={thought.children}
        />
      ))}
    </section>
  );
}

export default ThoughtsTab;
