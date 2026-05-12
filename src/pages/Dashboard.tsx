import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, X } from "lucide-react"
import type { DashboardColumn } from "@/interfaces/data/DashboardTask"
import { supabase } from "@/lib/supabase"

interface DashboardProps {
  storeId: string
  userRole: string
}

interface TaskItem {
  id: string
  columnId: string
  title: string
  description: string
  dueDate: string | null
}

interface ColumnItem {
  id: string
  name: string
  tasks: TaskItem[]
}

export default function Dashboard({ storeId, userRole }: DashboardProps) {
  const [columns, setColumns] = useState<ColumnItem[]>([])
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [addingTaskToColumn, setAddingTaskToColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  const loadKanban = async () => {
    if (!storeId) return

    const { data: cols } = await supabase
      .from('dashboard_columns')
      .select('*')
      .eq('store_id', storeId)
      .order('position', { ascending: true })

    const { data: tasks } = await supabase
      .from('dashboard_tasks')
      .select('*')
      .eq('store_id', storeId)

    const dbColumns = (cols || []) as DashboardColumn[]
    const dbTasks = (tasks || [])

    if (dbColumns.length === 0) {
      await supabase.from('dashboard_columns').insert([
        { store_id: storeId, name: 'Por hacer', position: 0 },
        { store_id: storeId, name: 'En progreso', position: 1 },
        { store_id: storeId, name: 'Hecho', position: 2 }
      ])
      setColumns([
        { id: 'col-1', name: 'Por hacer', tasks: [] },
        { id: 'col-2', name: 'En progreso', tasks: [] },
        { id: 'col-3', name: 'Hecho', tasks: [] }
      ])
    } else {
      setColumns(dbColumns.map(col => ({
        id: col.id,
        name: col.name,
        tasks: dbTasks
          .filter(t => t.column_id === col.id)
          .map(t => ({
            id: t.id,
            columnId: t.column_id,
            title: t.title,
            description: t.description || '',
            dueDate: t.due_date
          }))
      })))
    }
  }

  useEffect(() => {
    loadKanban()
  }, [storeId])

  const isAdmin = userRole === 'admin'

  const isUrgent = (dueDate: string | null) => {
    if (!dueDate) return false
    const due = new Date(dueDate)
    const now = new Date()
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  }

  const startEditColumn = (col: ColumnItem) => {
    if (!isAdmin) return
    setEditingColumnId(col.id)
    setEditingColumnName(col.name)
  }

  const saveColumnName = async () => {
    if (!editingColumnId || !storeId) return
    await supabase
      .from('dashboard_columns')
      .update({ name: editingColumnName })
      .eq('id', editingColumnId)
    setColumns(prev => prev.map(c => c.id === editingColumnId ? { ...c, name: editingColumnName } : c))
    setEditingColumnId(null)
  }

  const addTask = async () => {
    if (!addingTaskToColumn || !newTaskTitle.trim() || !storeId) return
    setSavingTask(true)
    try {
      const { data } = await supabase
        .from('dashboard_tasks')
        .insert({
          store_id: storeId,
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          due_date: newTaskDueDate || null,
          column_id: addingTaskToColumn,
          created_by: ''
        })
        .select()
        .single()
      if (data) {
        const newTask: TaskItem = {
          id: data.id,
          columnId: data.column_id,
          title: data.title,
          description: data.description || '',
          dueDate: data.due_date
        }
        setColumns(prev => prev.map(c =>
          c.id === addingTaskToColumn ? { ...c, tasks: [...c.tasks, newTask] } : c
        ))
        setAddingTaskToColumn(null)
        setNewTaskTitle('')
        setNewTaskDesc('')
        setNewTaskDueDate('')
      }
    } finally {
      setSavingTask(false)
    }
  }

  const deleteTask = async (taskId: string, columnId: string) => {
    await supabase.from('dashboard_tasks').delete().eq('id', taskId)
    setColumns(prev => prev.map(c =>
      c.id === columnId ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) } : c
    ))
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Tareas</h2>
        <Button size="sm" onClick={() => setAddingTaskToColumn(columns[0]?.id || '')}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Tarea
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div key={col.id} className="flex-shrink-0 w-72 bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              {editingColumnId === col.id ? (
                <Input
                  value={editingColumnName}
                  onChange={e => setEditingColumnName(e.target.value)}
                  onBlur={saveColumnName}
                  onKeyDown={e => e.key === 'Enter' && saveColumnName()}
                  className="h-8 text-sm"
                  autoFocus
                />
              ) : (
                <h3
                  className={`font-semibold text-foreground ${isAdmin ? 'cursor-pointer hover:text-primary' : ''}`}
                  onClick={() => startEditColumn(col)}
                >
                  {col.name}
                </h3>
              )}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {col.tasks.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {col.tasks.map(task => (
                <div
                  key={task.id}
                  className={`bg-card p-3 rounded-md text-sm border ${isUrgent(task.dueDate) ? 'border-red-500 border-2' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-foreground">{task.title}</span>
                    {isAdmin && (
                      <button
                        onClick={() => deleteTask(task.id, col.id)}
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  )}
                  {task.dueDate && (
                    <p className={`text-xs mt-2 border-t border-border pt-2 ${isUrgent(task.dueDate) ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                      Vence: {new Date(task.dueDate).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 h-8"
              onClick={() => setAddingTaskToColumn(col.id)}
            >
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!addingTaskToColumn} onOpenChange={() => setAddingTaskToColumn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título de la tarea"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={newTaskDesc}
              onChange={e => setNewTaskDesc(e.target.value)}
            />
            <Input
              type="date"
              value={newTaskDueDate}
              onChange={e => setNewTaskDueDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingTaskToColumn(null)}>Cancelar</Button>
            <Button onClick={addTask} disabled={savingTask || !newTaskTitle.trim()}>
              {savingTask ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}