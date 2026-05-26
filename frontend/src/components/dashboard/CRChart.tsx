import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DriftData } from '../../types'

interface CRChartProps {
  drift: DriftData
}

export function CRChart({ drift }: CRChartProps) {
  const isDark = document.documentElement.classList.contains('dark')

  const data = [
    { name: 'Approved',   value: drift.approved_crs, color: '#7EE787' },
    { name: 'Pending',    value: drift.pending_crs,  color: '#F5A524' },
    { name: 'Rejected',   value: drift.rejected_crs, color: '#ef4444' },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="card p-5 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">CR Overview</h3>
        <div className="flex items-center justify-center h-36 text-gray-500 text-sm">
          No change requests yet
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">CR Overview</h3>
        <span className="text-2xl font-bold">{drift.total_crs}</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: isDark ? '#1e1e1e' : '#ffffff',
              border: `1px solid ${isDark ? '#2e2e2e' : '#e2e8f0'}`,
              borderRadius: 8,
              color: isDark ? '#fff' : '#1e293b',
              fontSize: 12,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280', fontSize: 12 }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
