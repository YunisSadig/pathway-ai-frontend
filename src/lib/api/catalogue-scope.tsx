"use client";

import { createContext, useContext } from "react";

/** Which door the discovery screens use: "public" (allow-listed fields, no catalogue access) or "full" (the protected catalogue). */
export type CatalogueScope = "public" | "full";

const Scope = createContext<CatalogueScope>("full");
export const CatalogueScopeProvider = Scope.Provider;
export const useCatalogueScope = () => useContext(Scope);
