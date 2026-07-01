import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConnectionStore } from "@/stores/connection-store";
import { appErrorMessage } from "@/lib/types";
import type { AuthConfig, Connection, PingResult } from "@/lib/types";

interface Props {
  initial?: Connection;
  onSaved?: (conn: Connection) => void;
}

const EMPTY: Connection = {
  id: "",
  name: "",
  url: "http://localhost:8086",
  default_database: "",
  skip_tls_verify: false,
  auth: { type: "none" },
};

export function ConnectionForm({ initial, onSaved }: Props) {
  const [conn, setConn] = useState<Connection>(initial ?? EMPTY);
  const [secret, setSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [ping, setPing] = useState<PingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useConnectionStore((s) => s.save);
  const test = useConnectionStore((s) => s.test);

  function setAuth(auth: AuthConfig) {
    setConn({ ...conn, auth });
    setSecret("");
    setPing(null);
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setPing(null);
    try {
      const result = await test(conn, secret || null);
      setPing(result);
    } catch (e) {
      setError(appErrorMessage(e as never));
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setError(null);
    try {
      const saved = await save(conn, secret || null);
      onSaved?.(saved);
    } catch (e) {
      setError(appErrorMessage(e as never));
    }
  }

  const needsSecret = conn.auth.type !== "none";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">名称</Label>
        <Input
          id="name"
          value={conn.name}
          onChange={(e) => setConn({ ...conn, name: e.target.value })}
          placeholder="prod"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          value={conn.url}
          onChange={(e) => setConn({ ...conn, url: e.target.value })}
          placeholder="http://localhost:8086"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="db">默认 Database (可选)</Label>
        <Input
          id="db"
          value={conn.default_database ?? ""}
          onChange={(e) => setConn({ ...conn, default_database: e.target.value })}
          placeholder="mydb"
        />
      </div>

      <div className="grid gap-2">
        <Label>认证方式</Label>
        <Select
          value={conn.auth.type}
          onValueChange={(v) => {
            if (v === "none") setAuth({ type: "none" });
            else if (v === "basic") setAuth({ type: "basic", username: "" });
            else if (v === "token") setAuth({ type: "token" });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">无认证</SelectItem>
            <SelectItem value="basic">Basic Auth</SelectItem>
            <SelectItem value="token">Token (1.8+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {conn.auth.type === "basic" && (
        <div className="grid gap-2">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            value={(conn.auth as { username: string }).username}
            onChange={(e) =>
              setConn({ ...conn, auth: { type: "basic", username: e.target.value } })
            }
          />
        </div>
      )}

      {needsSecret && (
        <div className="grid gap-2">
          <Label htmlFor="secret">
            {conn.auth.type === "basic" ? "密码" : "Token"}
          </Label>
          <Input
            id="secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={initial ? "留空则保留原值" : ""}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id="tls"
          type="checkbox"
          checked={conn.skip_tls_verify}
          onChange={(e) => setConn({ ...conn, skip_tls_verify: e.target.checked })}
          className="h-4 w-4"
        />
        <Label htmlFor="tls" className="cursor-pointer">
          跳过 TLS 证书验证 (自签名 HTTPS)
        </Label>
      </div>

      {ping && (
        <div className="rounded-md border border-border bg-muted/30 p-2 text-sm">
          ✅ 连接成功 — InfluxDB 版本: <strong>{ping.version}</strong>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? "测试中..." : "测试连接"}
        </Button>
        <Button onClick={handleSave} disabled={!conn.name || !conn.url}>
          保存
        </Button>
      </div>
    </div>
  );
}
