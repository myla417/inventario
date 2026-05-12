import * as React from "react"
import { ResponsiveContainer } from "recharts"

interface ChartConfig {
  [key: string]: {
    label: string
    color?: string
  }
}

interface ChartContainerProps {
  config: ChartConfig
  className?: string
  children: React.ReactNode
}

export function ChartContainer({ config, className, children }: ChartContainerProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        {Object.entries(config).map(([key, value]) => (
          <span key={key} style={{ color: value.color || "hsl(var(--chart-1))" }}>
            {value.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ChartTooltip({ content }: { content?: React.ReactNode }) {
  return <>{content}</>
}

export function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm text-foreground">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  )
}