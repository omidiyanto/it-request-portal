import { useState } from "react";
import { Search, Plus } from "lucide-react";
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
            <div className="flex items-center">
              <a href="/">
                <img src="/logo.png" alt="IT Request Portal Logo" className="h-20 w-auto" />
              </a>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex">
              <button
                onClick={() => setActiveTab("create")}
                className={`flex items-center px-4 py-2 rounded-md ${
                  activeTab === "create" 
                    ? "bg-primary text-white" 
                    : "bg-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`flex items-center px-4 py-2 rounded-md ml-2 ${
                  activeTab === "search" 
                    ? "bg-transparent text-white border border-gray-700" 
                    : "bg-transparent text-gray-400 hover:text-white"
                }`}
              >
                <Search className="w-4 h-4 mr-2" />
                Search Request
              </button>
            </div>
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
