export default function Home() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-sm">
        <HelloWorldCard />
      </div>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function HelloWorldCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello world</CardTitle>
      </CardHeader>
      <CardContent>This page is rendered with shadcn/ui.</CardContent>
    </Card>
  )
}
