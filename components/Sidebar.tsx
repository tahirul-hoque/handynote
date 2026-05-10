'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Note } from '@/types/note';
import { Plus, Trash2, FileText, Menu, X } from 'lucide-react';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';

export default function Sidebar() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [pathname]); // Refresh when path changes

  const handleCreateNote = async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Note', canvasJson: '' }),
      });
      if (res.ok) {
        const { note } = await res.json();
        router.push(`/notes/${note._id}`);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(notes.filter((n) => n._id !== id));
        if (pathname === `/notes/${id}`) {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md border border-gray-200 dark:border-gray-700"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } md:relative md:h-screen`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between mt-12 md:mt-0">
          <Link href="/" className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FileText className="text-blue-500" />
            HandyNote
          </Link>
          <ThemeToggle />
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <button
            onClick={handleCreateNote}
            className="w-full mb-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors font-medium shadow-sm hover:shadow-md"
          >
            <Plus size={20} />
            New Note
          </button>

          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          <div className="space-y-2 mt-4">
            {filteredNotes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No notes found.</p>
            ) : (
              filteredNotes.map((note) => (
                <Link
                  key={note._id}
                  href={`/notes/${note._id}`}
                  onClick={() => setIsOpen(false)}
                  className={`group flex items-center justify-between p-3 rounded-lg border transition-all ${
                    pathname === `/notes/${note._id}`
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm'
                  }`}
                >
                  <div className="truncate pr-2">
                    <h3 className={`font-medium truncate ${pathname === `/notes/${note._id}` ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                      {note.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(note._id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                    aria-label="Delete note"
                  >
                    <Trash2 size={16} />
                  </button>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <LogoutButton />
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
