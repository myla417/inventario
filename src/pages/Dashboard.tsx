import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, X, ChevronLeft, ChevronRight, Pencil, Calendar } from "lucide-react"
import type { DashboardColumn } from "@/interfaces/data/DashboardTask"
import { supabase } from "@/lib/supabase"

interface DashboardProps {
  storeId: string
  userRole: string
  kanbanColumns: DashboardColumn[]
  kanbanTasks: any[]
  setKanbanColumns: (cols: DashboardColumn[]) => void
  setKanbanTasks: (tasks: any[]) => void
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
  position: number
  tasks: TaskItem[]
}

export default function Dashboard({ storeId, userRole, kanbanColumns, kanbanTasks, setKanbanColumns, setKanbanTasks }: DashboardProps) {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [addingTaskToColumn, setAddingTaskToColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskDesc, setEditTaskDesc] = useState('')
  const [editTaskDueDate, setEditTaskDueDate] = useState('')
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null)

  const columns: ColumnItem[] = kanbanColumns.length === 0
    ? [
        { id: 'col-1', name: 'Por hacer', position: 0, tasks: [] },
        { id: 'col-2', name: 'En progreso', position: 1, tasks: [] },
        { id: 'col-3', name: 'Hecho', position: 2, tasks: [] }
      ]
    : kanbanColumns.map(col => ({
        id: col.id,
        name: col.name,
        position: col.position,
        tasks: kanbanTasks
          .filter(t => t.column_id === col.id)
          .map(t => ({
            id: t.id,
            columnId: t.column_id,
            title: t.title,
            description: t.description || '',
            dueDate: t.due_date
          }))
      }))


  const isUrgent = (dueDate: string | null) => {
    if (!dueDate) return false
    const due = new Date(dueDate)
    const now = new Date()
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  }

  const startEditColumn = (col: ColumnItem) => {
    setEditingColumnId(col.id)
    setEditingColumnName(col.name)
  }

  const saveColumnName = async () => {
    if (!editingColumnId) return
    await supabase
      .from('dashboard_columns')
      .update({ name: editingColumnName })
      .eq('id', editingColumnId)
    setKanbanColumns(kanbanColumns.map(c => c.id === editingColumnId ? { ...c, name: editingColumnName } : c))
    setEditingColumnId(null)
  }

  const handleDoubleClickAdd = (colId: string) => {
    setQuickAddColumn(colId)
  }

  const quickAddTask = async () => {
    if (!quickAddColumn || !newTaskTitle.trim() || !storeId) return
    setSavingTask(true)
    try {
      const { data } = await supabase
        .from('dashboard_tasks')
        .insert({
          store_id: storeId,
          title: newTaskTitle.trim(),
          description: '',
          due_date: null,
          column_id: quickAddColumn,
          created_by: ''
        })
        .select()
        .single()
      if (data) {
        setKanbanTasks([...kanbanTasks, data])
        setQuickAddColumn(null)
        setNewTaskTitle('')
      }
    } finally {
      setSavingTask(false)
    }
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
        setKanbanTasks([...kanbanTasks, data])
        setAddingTaskToColumn(null)
        setNewTaskTitle('')
        setNewTaskDesc('')
        setNewTaskDueDate('')
      }
    } finally {
      setSavingTask(false)
    }
  }

  const openEditTask = (task: TaskItem) => {
    setEditingTask(task)
    setEditTaskTitle(task.title)
    setEditTaskDesc(task.description)
    setEditTaskDueDate(task.dueDate || '')
  }

  const saveEditTask = async () => {
    if (!editingTask || !editTaskTitle.trim()) return
    setSavingTask(true)
    try {
      await supabase
        .from('dashboard_tasks')
        .update({
          title: editTaskTitle.trim(),
          description: editTaskDesc.trim(),
          due_date: editTaskDueDate || null
        })
        .eq('id', editingTask.id)
      setKanbanTasks(kanbanTasks.map(t => t.id === editingTask.id ? { ...t, title: editTaskTitle.trim(), description: editTaskDesc.trim(), due_date: editTaskDueDate || null } : t))
      setEditingTask(null)
    } finally {
      setSavingTask(false)
    }
  }

  const deleteTask = async (taskId: string) => {
    await supabase.from('dashboard_tasks').delete().eq('id', taskId)
    setKanbanTasks(kanbanTasks.filter(t => t.id !== taskId))
  }

  const moveTask = async (task: TaskItem, direction: 'left' | 'right') => {
    const colIndex = columns.findIndex(c => c.id === task.columnId)
    if (colIndex === -1) return

    const newColIndex = direction === 'left' ? colIndex - 1 : colIndex + 1
    if (newColIndex < 0 || newColIndex >= columns.length) return

    const newColumnId = columns[newColIndex].id
    await supabase
      .from('dashboard_tasks')
      .update({ column_id: newColumnId })
      .eq('id', task.id)

    setKanbanTasks(kanbanTasks.map(t => t.id === task.id ? { ...t, column_id: newColumnId } : t))
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Tareas y Eventos</h2>
        <Button size="sm" onClick={() => setAddingTaskToColumn(columns[0]?.id || '')}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Tarea
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {columns.map((col, colIndex) => (
          <div key={col.id} className="flex-shrink-0 w-[85vw] sm:w-72 bg-muted/50 rounded-lg p-3 sm:p-4">
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
                  className={`font-semibold text-foreground text-sm sm:text-base cursor-pointer hover:text-primary`}
                  onClick={() => startEditColumn(col)}
                >
                  {col.name}
                </h3>
              )}
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {col.tasks.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[150px] sm:min-h-[200px]">
              {col.tasks.map((task) => {
                  const isLastColumn = colIndex === columns.length - 1
                  return (
                    <div
                      key={task.id}
                      className={`bg-card p-3 sm:p-4 rounded-lg text-sm border-2 touch-manipulation ${isLastColumn ? 'border-green-500' : isUrgent(task.dueDate) ? 'border-red-500' :  'border-blue-500'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground text-sm sm:text-base leading-tight">{task.title}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditTask(task)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-accent touch-manipulation"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-accent touch-manipulation"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 sm:line-clamp-none">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                        <button
                          onClick={() => moveTask(task, 'left')}
                          disabled={colIndex === 0}
                          className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                          title="Mover a la izquierda"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {task.dueDate && (
                          <div className={`flex items-center gap-1.5 border-t border-border/50 ${isUrgent(task.dueDate) && !isLastColumn ? 'text-red-500' : 'text-muted-foreground'}`}>
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="text-xs font-medium">
                              {new Date(task.dueDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => moveTask(task, 'right')}
                          disabled={colIndex === columns.length - 1}
                          className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                          title="Mover a la derecha"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 h-10 sm:h-8 text-xs sm:text-sm"
              onClick={() => setAddingTaskToColumn(col.id)}
              onDoubleClick={() => handleDoubleClickAdd(col.id)}
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" /> Agregar
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!addingTaskToColumn} onOpenChange={() => setAddingTaskToColumn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título de la tarea"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="bg-input border-border text-base"
              autoFocus
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={newTaskDesc}
              onChange={e => setNewTaskDesc(e.target.value)}
              className="bg-input border-border min-h-[80px]"
            />
            <Input
              type="date"
              value={newTaskDueDate}
              onChange={e => setNewTaskDueDate(e.target.value)}
              className="bg-input border-border [appearance:none] [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAddingTaskToColumn(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={addTask} disabled={savingTask || !newTaskTitle.trim()} className="w-full sm:w-auto">
              {savingTask ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quickAddColumn} onOpenChange={() => setQuickAddColumn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Tarea Rápido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título de la tarea"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="bg-input border-border text-base"
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setQuickAddColumn(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={quickAddTask} disabled={savingTask || !newTaskTitle.trim()} className="w-full sm:w-auto">
              {savingTask ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título de la tarea"
              value={editTaskTitle}
              onChange={e => setEditTaskTitle(e.target.value)}
              className="bg-input border-border text-base"
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={editTaskDesc}
              onChange={e => setEditTaskDesc(e.target.value)}
              className="bg-input border-border min-h-[80px]"
            />
            <Input
              type="date"
              value={editTaskDueDate}
              onChange={e => setEditTaskDueDate(e.target.value)}
              className="bg-input border-border [appearance:none] [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditingTask(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={saveEditTask} disabled={savingTask || !editTaskTitle.trim()} className="w-full sm:w-auto">
              {savingTask ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}