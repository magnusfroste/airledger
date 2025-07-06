import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts";

interface MonthlyBreakdown {
  month: string;
  revenue: number;
  expenses: number;
  netResult: number;
}

interface ChartsSectionProps {
  monthlyBreakdown: MonthlyBreakdown[];
  formatCurrency: (amount: number) => string;
}

const ChartsSection = ({ monthlyBreakdown, formatCurrency }: ChartsSectionProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Revenue & Expenses Bar Chart */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Månatlig översikt</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              revenue: {
                label: "Försäljning",
                color: "hsl(142, 76%, 36%)",
              },
              expenses: {
                label: "Kostnader",
                color: "hsl(0, 84%, 60%)",
              },
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" name="Försäljning" />
                <Bar dataKey="expenses" fill="var(--color-expenses)" name="Kostnader" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Net Result Line Chart */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Nettoresultat per månad</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              netResult: {
                label: "Nettoresultat",
                color: "hsl(217, 91%, 60%)",
              },
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line 
                  type="monotone" 
                  dataKey="netResult" 
                  stroke="var(--color-netResult)" 
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="Nettoresultat"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartsSection;