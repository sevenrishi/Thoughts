"use client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { useOrganization } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThoughtValidation } from "@/lib/validations/thought";
import { createThought } from "@/lib/actions/thought.actions";
import EmojiPicker from "emoji-picker-react"; // Import the emoji library

interface Props {
  userId: string;
}

function PostThought({ userId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { organization } = useOrganization();
  const form = useForm<z.infer<typeof ThoughtValidation>>({
    resolver: zodResolver(ThoughtValidation),
    defaultValues: {
      thought: "",
      accountId: userId,
    },
  });

  const onSubmit = async (values: z.infer<typeof ThoughtValidation>) => {
    await createThought({
      text: values.thought,
      author: userId,
      communityId: organization ? organization.id : null,
      path: pathname,
    });
    router.push("/");
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker visibility

  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker); // Toggle emoji picker visibility
  };

  const handleEmojiSelect = (event, emojiObject) => {
    if (!emojiObject || !emojiObject.emoji) return; // Return early if undefined
  
    // Directly update the 'thought' field using form.setValue
    form.setValue("thought", (currentThought) => currentThought + emojiObject.emoji);
    setShowEmojiPicker(false); // Close the emoji picker
  };
  
  
  

  return (
    <Form {...form}>
      <form
        className='mt-10 flex flex-col justify-start gap-10'
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {/* ... other form fields ... */}

        <FormField
  control={form.control}
  name='thought'
  render={({ field }) => (
    <FormItem className='flex w-full flex-col gap-3'>
       <FormLabel className='text-base-semibold text-light-2'>
                Content
              </FormLabel>
      {/* ... other form item elements ... */}
      <FormControl className='no-focus border border-dark-4 bg-dark-3 text-light-1'>
        <> {/* Wrap multiple elements in a fragment */}
          <Textarea rows={15} {...field} style={{ color: 'white'}} />
          
        </>
      </FormControl>
      <button onClick={handleEmojiClick} className="emoji-button">
            ️ [😊   🔥   🚀   ❤️   🎉   🤔   👍   👎   🌟"]
          </button>
      
    </FormItem>
  )}
/>

{showEmojiPicker && (
  <EmojiPicker onEmojiClick={handleEmojiSelect} />
)}

        <Button type='submit' className='bg-primary-500'>
          Post Thought
        </Button>
      </form>
    </Form>
  );
}

export default PostThought;
