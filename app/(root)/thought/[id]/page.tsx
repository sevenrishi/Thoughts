import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs";

import Comment from "@/components/forms/Comment";
import ThoughtCard from "@/components/cards/ThoughtCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchThoughtById } from "@/lib/actions/thought.actions";

export const revalidate = 0;

async function page({ params }: { params: { id: string } }) {
  if (!params.id) return null;

  const user = await currentUser();
  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  const thought = await fetchThoughtById(params.id);

  return (
    <section className='relative'>
      <div>
        <ThoughtCard
          id={thought._id}
          currentUserId={user.id}
          parentId={thought.parentId}
          content={thought.text}
          author={thought.author}
          community={thought.community}
          createdAt={thought.createdAt}
          comments={thought.children}
        />
      </div>

      <div className='mt-7'>
        <Comment
          thoughtId={params.id}
          currentUserImg={user.imageUrl}
          currentUserId={JSON.stringify(userInfo._id)}
        />
      </div>

      <div className='mt-10'>
        {thought.children.map((childItem: any) => (
          <ThoughtCard
            key={childItem._id}
            id={childItem._id}
            currentUserId={user.id}
            parentId={childItem.parentId}
            content={childItem.text}
            author={childItem.author}
            community={childItem.community}
            createdAt={childItem.createdAt}
            comments={childItem.children}
            isComment
          />
        ))}
      </div>
    </section>
  );
}

export default page;
