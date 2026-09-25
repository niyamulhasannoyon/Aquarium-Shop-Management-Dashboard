import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function TodosPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <div className="p-8 max-w-md mx-auto text-white">
      <h1 className="text-xl font-bold mb-4">Supabase Todos</h1>
      {(!todos || todos.length === 0) ? (
        <p className="text-slate-400 text-sm">No todos found in Supabase database.</p>
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          {todos.map((todo: any) => (
            <li key={todo.id}>{todo.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
