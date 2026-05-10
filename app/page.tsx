import { Pencil } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-black">
      <div className="text-center max-w-md p-8">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full inline-block mb-6">
          <Pencil size={48} className="text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Welcome to HandyNote</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Select a note from the sidebar or create a new one to start writing, drawing, and capturing your ideas.
        </p>
      </div>
    </div>
  );
}
