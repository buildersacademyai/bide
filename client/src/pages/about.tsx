import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">About Blockchain IDE</h1>
        
        <div className="prose prose-lg">
          <p className="lead mb-6">
            A powerful, web-based Integrated Development Environment for blockchain development,
            making it easier than ever to write, compile, and deploy smart contracts.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Key Features</h2>
          <ul>
            <li>Real-time Solidity compilation</li>
            <li>Integrated contract deployment</li>
            <li>Interactive contract testing interface</li>
            <li>Multi-network support</li>
            <li>Advanced code editor with syntax highlighting</li>
          </ul>

          <div className="mt-8">
            <Link href="/app">
              <Button size="lg" className="mr-4">
                Launch IDE
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
