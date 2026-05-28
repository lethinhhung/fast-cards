"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addTag,
  countCardsWithTag,
  deleteTag,
  renameTag,
  useTags,
} from "@/lib/storage";

type DeleteTarget = { id: string; name: string; usage: number };

export default function TagsPage() {
  const tags = useTags();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  if (tags === null) return null;

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const tag = addTag(trimmed);
    if (!tag) {
      setError("A tag with that name already exists.");
      return;
    }
    setName("");
    setError(null);
  };

  const beginEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditValue(current);
    setEditError(null);
  };

  const saveEdit = (id: string) => {
    const ok = renameTag(id, editValue);
    if (!ok) {
      setEditError("Name must be unique and not empty.");
      return;
    }
    setEditingId(null);
    setEditValue("");
    setEditError(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tags</h1>

      <form onSubmit={onCreate} className="space-y-2">
        <Label htmlFor="new-tag">New tag</Label>
        <div className="flex gap-2">
          <Input
            id="new-tag"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. spanish"
          />
          <Button type="submit" disabled={!name.trim()}>
            Add
          </Button>
        </div>
        {error && (
          <p className="text-sm text-amber-600 dark:text-amber-500">{error}</p>
        )}
      </form>

      {tags.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No tags yet.
        </div>
      ) : (
        <ul className="rounded-md border divide-y">
          {tags.map((t) => {
            const usage = countCardsWithTag(t.id);
            const isEditing = editingId === t.id;
            return (
              <li
                key={t.id}
                className="p-3 flex flex-wrap items-center gap-3"
              >
                {isEditing ? (
                  <div className="flex-1 min-w-0 space-y-1">
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        if (editError) setEditError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit(t.id);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                    />
                    {editError && (
                      <p className="text-sm text-amber-600 dark:text-amber-500">
                        {editError}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <Badge variant="secondary" className="h-6 px-2 text-sm">
                      {t.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {usage} {usage === 1 ? "card" : "cards"}
                    </span>
                  </>
                )}
                <div className="flex gap-1 ml-auto shrink-0">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(t.id)}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => beginEdit(t.id, t.name)}
                      >
                        Rename
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setPendingDelete({
                            id: t.id,
                            name: t.name,
                            usage,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.name}&rdquo; will be removed
              {pendingDelete && pendingDelete.usage > 0
                ? ` from ${pendingDelete.usage} ${
                    pendingDelete.usage === 1 ? "card" : "cards"
                  }.`
                : "."}{" "}
              The cards themselves are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteTag(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
