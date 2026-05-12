import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Receipt } from "lucide-react"

interface ExpensesProps {
  storeId: string
}

export default function Expenses(_props: ExpensesProps) {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Gastos</h2>
      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Registro de Gastos</CardTitle>
          <CardDescription>Control de gastos del negocio</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">Módulo de gastos en desarrollo</p>
        </CardContent>
      </Card>
    </div>
  )
}