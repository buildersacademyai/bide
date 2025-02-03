import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, Zap, Shield } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="py-20 text-center">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Build Smart Contracts with Confidence
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A powerful, web-based IDE for blockchain development. Write, compile, and deploy
              smart contracts seamlessly.
            </p>
            <Link href="/app">
              <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                Start Building <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-8 py-16">
            <div className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
              <Code className="h-10 w-10 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Smart Editor</h3>
              <p className="text-muted-foreground">
                Advanced code editor with Solidity syntax highlighting and real-time error detection.
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
              <Zap className="h-10 w-10 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Instant Compilation</h3>
              <p className="text-muted-foreground">
                Compile your contracts directly in the browser with immediate feedback.
              </p>
            </div>

            <div className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
              <Shield className="h-10 w-10 mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Secure Deployment</h3>
              <p className="text-muted-foreground">
                Deploy contracts securely with MetaMask integration and contract verification.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="py-16 text-center border-t">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Ready to Start Building?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join developers worldwide who are building the future of blockchain.
            </p>
            <Link href="/app">
              <Button size="lg" className="bg-primary hover:bg-primary/90">Launch IDE</Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}