"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { useLabTrends } from "@/lib/clinora-api";

interface LabChartProps {
  patientId: string;
  testName: string;
  title?: string;
}

export function LabChart({ patientId, testName, title }: LabChartProps) {
  const { trends, loading, error } = useLabTrends(patientId, testName);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || testName}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  if (error || !trends || !trends.data || trends.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || testName}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Map the trends data to the chart format
  const data = trends.data.map((d: any) => {
    // Attempt to parse "min-max" from referenceRange (e.g. "4.0-5.6" or "90-120")
    let normalMin = 0;
    let normalMax = 0;
    
    if (typeof d.referenceRange === 'string') {
       const rangeMatch = d.referenceRange.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
       if (rangeMatch) {
         normalMin = Number(rangeMatch[1]);
         normalMax = Number(rangeMatch[2]);
       } else if (d.referenceRange.startsWith('<')) {
         normalMax = Number(d.referenceRange.replace('<', '').trim());
       } else if (d.referenceRange.startsWith('>')) {
         normalMin = Number(d.referenceRange.replace('>', '').trim());
         normalMax = normalMin * 1.5; // Arbitrary for charts
       }
    } else if (typeof d.referenceRange === 'object' && d.referenceRange) {
       normalMin = d.referenceRange.min || 0;
       normalMax = d.referenceRange.max || 0;
    }

    return {
      date: d.date,
      value: Number(d.value),
      normalMin,
      normalMax
    };
  });

  const normalMin = data[data.length - 1].normalMin;
  const normalMax = data[data.length - 1].normalMax;
  const maxValue = Math.max(...data.map((d: any) => d.value), normalMax || 0) * 1.1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title || testName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="normalRange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "2-digit",
                  })
                }
              />
              <YAxis
                domain={[0, maxValue]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
                labelFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                }
              />
              {/* Normal range area */}
              {normalMax > 0 && (
                <>
                  <ReferenceLine
                    y={normalMax}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                  />
                  <ReferenceLine
                    y={normalMin}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                  />
                </>
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{
                  fill: "hsl(var(--chart-1))",
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: "hsl(var(--chart-1))",
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          {normalMax > 0 ? (
            <span>
              Normal range: {normalMin} - {normalMax}
            </span>
          ) : (
            <span>No reference range</span>
          )}
          <span className="font-medium text-foreground">
            Latest: {data[data.length - 1].value}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
