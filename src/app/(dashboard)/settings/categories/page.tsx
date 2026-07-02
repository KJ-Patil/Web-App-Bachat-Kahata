"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Archive, ArchiveRestore, Layers } from "lucide-react";
import AddCategoryModal, { CategoryData } from "@/components/modals/AddCategoryModal";
import { CATEGORY_ICONS as iconMap, DEFAULT_CATEGORIES } from "@/core/utils/categories";

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("custom_categories");
      if (stored) {
        setCategories(JSON.parse(stored));
      } else {
        setCategories(DEFAULT_CATEGORIES);
        localStorage.setItem("custom_categories", JSON.stringify(DEFAULT_CATEGORIES));
      }

      const archived = localStorage.getItem("archived_categories");
      if (archived) {
        setArchivedIds(JSON.parse(archived));
      }
    }
  }, []);

  const handleAddCategory = (newCat: CategoryData) => {
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem("custom_categories", JSON.stringify(updated));
  };

  const toggleArchive = (id: string) => {
    const isArchived = archivedIds.includes(id);
    let updated;
    if (isArchived) {
      updated = archivedIds.filter(aid => aid !== id);
    } else {
      updated = [...archivedIds, id];
    }
    setArchivedIds(updated);
    localStorage.setItem("archived_categories", JSON.stringify(updated));
  };

  const activeCategories = categories.filter(c => !archivedIds.includes(c.id));
  const archivedCategories = categories.filter(c => archivedIds.includes(c.id));

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="flex justify-between items-center bg-card border border-border p-4 rounded-2xl shadow-sm">
        <Link
          href="/settings"
          className="flex items-center gap-2 text-xs font-bold text-foreground-secondary hover:text-primary transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
        >
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </header>

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
          Category Engine
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Organize transaction buckets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active List */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2 flex items-center gap-2">
            Active Tags <span className="bg-primary-lighter text-primary px-2 py-0.5 rounded-full">{activeCategories.length}</span>
          </h3>
          <div className="space-y-2">
            {activeCategories.map(cat => {
              const Icon = iconMap[cat.iconName] || Layers;
              return (
                <div key={cat.id} className="bg-card border border-border p-3 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground block">{cat.name}</span>
                      <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">{cat.type}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleArchive(cat.id)}
                    className="p-2 text-icon-muted hover:text-warning hover:bg-warning-light rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Archive Category"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Archived List */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2 flex items-center gap-2">
            Archived Tags <span className="bg-secondary text-foreground-muted px-2 py-0.5 rounded-full">{archivedCategories.length}</span>
          </h3>
          
          {archivedCategories.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 flex items-center justify-center text-xs font-bold text-foreground-muted text-center">
              No categories are currently archived.
            </div>
          ) : (
            <div className="space-y-2">
              {archivedCategories.map(cat => {
                const Icon = iconMap[cat.iconName] || Layers;
                return (
                  <div key={cat.id} className="bg-background-subtle border border-border p-3 rounded-xl flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white grayscale"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-foreground line-through">{cat.name}</span>
                    </div>
                    <button 
                      onClick={() => toggleArchive(cat.id)}
                      className="p-2 text-icon-muted hover:text-success hover:bg-success-light rounded-lg transition-colors"
                      title="Restore Category"
                    >
                      <ArchiveRestore className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AddCategoryModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={handleAddCategory} 
      />
    </div>
  );
}
