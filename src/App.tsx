import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { formatGreeting } from "@/lib/greet";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">InfluxDB GUI — scaffold</h1>

      <p className="text-muted-foreground">
        Tauri + React + TypeScript + Tailwind + shadcn/ui
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          className="h-9 rounded-md border border-input bg-background px-3"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <Button type="submit">Greet</Button>
      </form>

      <p className="text-lg" data-testid="greet-msg">
        {greetMsg || formatGreeting(name)}
      </p>
    </main>
  );
}

export default App;
