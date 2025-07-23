import { useState } from "react";
import { Ticket, Users, Search, Plus } from "lucide-react";
import CreateRequest from "@/components/create-request";
import SearchRequest from "@/components/search-request";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"create" | "search">("create");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Ticket className="text-primary text-2xl" />
              <h1 className="text-xl font-semibold text-foreground">IT Request Portal</h1>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="flex space-x-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("create")}
                className={`nav-tab ${activeTab === "create" ? "active" : ""}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`nav-tab ${activeTab === "search" ? "active" : ""}`}
              >
                <Search className="w-4 h-4 mr-2" />
                Search Request
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "create" ? <CreateRequest /> : <SearchRequest />}
      </main>
    </div>
  );
}
