import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import PostThought from "@/components/forms/PostThought";
import { fetchUser } from "@/lib/actions/user.actions";

async function Page() {
  const user = await currentUser();
  if (!user) return null;

  // fetch organization list created by user
  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) redirect("/onboarding");

  return (
    <>
      <h1 className='head-text'>Post Thought</h1>

      <PostThought userId={userInfo._id} />
    </>
  );
}

export default Page;
