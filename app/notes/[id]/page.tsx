import CanvasEditor from '@/components/CanvasEditor';
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import { notFound } from 'next/navigation';

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  await dbConnect();
  const noteDoc = await Note.findById(id);
  
  if (!noteDoc) {
    notFound();
  }

  // Convert to plain object to pass as prop
  const initialTitle = noteDoc.title;
  const initialCanvasJson = noteDoc.canvasJson || '';

  return (
    <CanvasEditor 
      noteId={id} 
      initialTitle={initialTitle} 
      initialCanvasJson={initialCanvasJson} 
    />
  );
}
