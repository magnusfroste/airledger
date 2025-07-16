import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Check, Receipt, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";
import DemoChat from "@/components/DemoChat";

const LandingPage = () => {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const handleShowDemo = () => {
    setShowDemo(true);
  };

  const handleCloseDemo = () => {
    setShowDemo(false);
  };

  const features = [
    {
      icon: Bot,
      title: "Prata svenska med AI:n",
      description: "Enkelt och praktiskt - tala naturligt på Svenska med Air, din bokföringsassistent. Ingen krånglig inmatning."
    },
    {
      icon: Receipt,
      title: "Automatisk kvittoanalys",
      description: "Fotografera kvitton - AI:n sköter resten av bokföringen"
    },
    {
      icon: BarChart3,
      title: "BAS-kontoplanen",
      description: "Byggd för Svenska företag med korrekt kontoplan från början"
    }
  ];

  const pricingPlans = [
    {
      name: "Gratis",
      price: "0 kr",
      period: "för alltid",
      description: "Perfekt för att komma igång",
      features: [
        "50 AI-analyser per månad",
        "500 MB lagring för kvitton",
        "Grundläggande bokföring",
        "BAS-kontoplanen",
        "Community support"
      ]
    },
    {
      name: "Premium", 
      price: "99 kr",
      period: "per månad",
      description: "För växande företag",
      features: [
        "500 AI-analyser per månad",
        "5 GB lagring för kvitton",
        "Avancerade rapporter",
        "Mallar och automation", 
        "Standard support"
      ],
      popular: true
    },
    {
      name: "Professional",
      price: "199 kr", 
      period: "per månad",
      description: "För professionella användare",
      features: [
        "Obegränsade AI-analyser",
        "50 GB lagring för kvitton",
        "Alla premium-funktioner",
        "Prioriterad support",
        "Anpassade rapporter"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AL</span>
            </div>
            <span className="text-xl font-semibold">AirLedger</span>
          </div>
          <Button onClick={handleGetStarted} variant="default">
            Kom igång gratis
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="w-fit">
                  <Bot className="w-4 h-4 mr-2" />
                  AI-driven bokföring
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Bokföring som
                  <span className="text-primary block">förstår dig</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  Tala med din AI-assistent på ren svenska - enkelt och praktiskt. Fotografera kvitton, ställ frågor naturligt - enklare kan det inte vara.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleGetStarted} 
                  size="lg" 
                  className="text-lg px-8 py-6"
                >
                  Börja gratis idag
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={handleShowDemo}
                >
                  Se hur det fungerar
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Gratis att komma igång
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  Ingen bindningstid
                </div>
              </div>
            </div>

            <div className="relative">
              {showDemo ? (
                <DemoChat onClose={handleCloseDemo} />
              ) : (
                <>
                  <img 
                    src={heroImage} 
                    alt="Air Ledger Dashboard" 
                    className="rounded-2xl shadow-2xl"
                  />
                  <div className="absolute -bottom-6 -left-6 bg-background border rounded-xl p-4 shadow-lg">
                    <div className="flex items-center gap-3">
                      <Bot className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">AI-assistent</p>
                        <p className="text-xs text-muted-foreground">Alltid redo att hjälpa</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Bokföring som faktiskt fungerar
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Bygg för svenska småföretag med AI som förstår BAS-kontoplanen och svensk bokföring
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center border-0 shadow-sm bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6" data-section="pricing">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Enkel och transparent prissättning
            </h2>
            <p className="text-xl text-muted-foreground">
              Börja gratis, uppgradera när du behöver mer
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Populärast
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">{plan.price}</div>
                    <div className="text-muted-foreground">{plan.period}</div>
                  </div>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={handleGetStarted}
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.name === "Gratis" ? "Kom igång gratis" : "Uppgradera nu"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Redo att förenkla din bokföring?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Börja prata Svenska med din AI-assistent redan idag. Gör som 1000-tals Svenska småföretagare, få en bättre koll med AI assistans! 
          </p>
          <Button 
            onClick={handleGetStarted}
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6"
          >
            Börja gratis idag
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t bg-background">
        <div className="max-w-6xl mx-auto text-center text-muted-foreground">
          <p>© 2025 AirLedger. Underlättar för Svenska småföretagare.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;