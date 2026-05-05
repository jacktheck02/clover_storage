"use client";

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { calculatePercentage, convertFileSize } from "@/lib/utils";

export const Chart = ({ used = 0 }: { used: number }) => {
  // Ensure used is a valid number
  const validUsed =
    typeof used === "number" &&
    !Number.isNaN(used) &&
    Number.isFinite(used) &&
    used >= 0
      ? used
      : 0;

  const percentage = calculatePercentage(validUsed);
  const validPercentage =
    Number.isNaN(percentage) || !Number.isFinite(percentage) || percentage < 0
      ? 0
      : Math.min(percentage, 100); // Cap at 100%

  // Calculate endAngle: start at 90° (top), progress clockwise
  // 0% = 90°, 100% = 450° (full circle)
  const endAngle = 90 + (validPercentage / 100) * 360;
  const chartData = [{ storage: validPercentage, fill: "white" }];

  return (
    <Card className="chart">
      <CardContent className="flex-1 p-0">
        <div className="chart-container">
          <RadialBarChart
            width={200}
            height={200}
            data={chartData}
            startAngle={90}
            endAngle={endAngle}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="polar-grid"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="storage" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="chart-total-percentage"
                        >
                          {validPercentage.toString().replace(/^0+/, "") || "0"}
                          %
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-white/70"
                        >
                          Space used
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </div>
      </CardContent>
      <CardHeader className="chart-details">
        <CardTitle className="chart-title">Available Storage</CardTitle>
        <CardDescription className="chart-description">
          {validUsed ? convertFileSize(validUsed) : "0"} / 128MB
        </CardDescription>
      </CardHeader>
    </Card>
  );
};
