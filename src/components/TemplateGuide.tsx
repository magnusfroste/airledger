
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Info, CheckCircle, ArrowRight, FileText, Users, User, Lightbulb, Calculator, CreditCard, Building, ShoppingCart } from "lucide-react";

export const TemplateGuide = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          <Info className="h-4 w-4 mr-1" />
          Hjälp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            Guide: Så fungerar transaktionsmallar
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="basics">Grunderna</TabsTrigger>
            <TabsTrigger value="accounting">Bokföring 101</TabsTrigger>
            <TabsTrigger value="create">Skapa mallar</TabsTrigger>
            <TabsTrigger value="examples">Exempel</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Vad är transaktionsmallar?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Transaktionsmallar är färdiga "recept" för vanliga affärstransaktioner. 
                  Istället för att manuellt välja konton och belopp varje gång, använder AI:n 
                  dessa mallar för att automatiskt föreslå rätt bokföring.
                </p>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Fördelar med mallar:</h4>
                  <ul className="space-y-2 text-green-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Snabbare bokföring - inga manuella val
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Färre fel - samma transaktion bokförs alltid likadant
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Konsistens - din bokföring blir mer ordnad
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Systemmallar vs Egna mallar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold">Systemmallar</h4>
                      <Badge variant="secondary">För alla</Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Skapade av AirLedger-teamet</li>
                      <li>• Tillgängliga för alla användare</li>
                      <li>• Används automatiskt av AI:n</li>
                      <li>• Täcker vanligaste affärstransaktioner</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-5 w-5 text-purple-600" />
                      <h4 className="font-semibold">Egna mallar</h4>
                      <Badge variant="outline">Endast dina</Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Skapade av dig</li>
                      <li>• Endast synliga för dig</li>
                      <li>• AI:n kan använda dem i dina konversationer</li>
                      <li>• Perfekt för dina specifika behov</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Bokföring förklarat enkelt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Grundprincipen:</h4>
                  <p className="text-blue-700">
                    Varje transaktion påverkar minst två konton. Det som kommer in på ett ställe 
                    måste komma från ett annat ställe. Detta kallas "dubbel bokföring".
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-green-600" />
                      Debet (vänster sida)
                    </h4>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-green-800 font-medium mb-2">Ökar för:</p>
                      <ul className="space-y-1 text-green-700 text-sm">
                        <li>• Tillgångar (pengar, lager, fordon)</li>
                        <li>• Kostnader (hyra, el, material)</li>
                      </ul>
                      <p className="text-green-600 text-xs mt-2 italic">
                        "Pengar in på bankkontot" eller "kostnad för företaget"
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-red-600 rotate-180" />
                      Kredit (höger sida)
                    </h4>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-800 font-medium mb-2">Ökar för:</p>
                      <ul className="space-y-1 text-red-700 text-sm">
                        <li>• Skulder (leverantörsskulder, lån)</li>
                        <li>• Intäkter (försäljning, räntor)</li>
                      </ul>
                      <p className="text-red-600 text-xs mt-2 italic">
                        "Pengar ut från bankkontot" eller "intäkt för företaget"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">Kom ihåg:</h4>
                  <p className="text-yellow-700">
                    Totala debetbelopp = Totala kreditbelopp (alltid!)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Så skapar du egna mallar</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="step1">
                    <AccordionTrigger>1. När behöver du en egen mall?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p>Skapa en egen mall när:</p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                            Du har återkommande transaktioner som systemmallarna inte täcker
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                            Din bransch har specifika behov
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                            Du vill ha mer kontroll över hur vissa transaktioner bokförs
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step2">
                    <AccordionTrigger>2. Fyll i grunduppgifter</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium mb-2">Mallnamn:</p>
                          <p className="text-sm text-gray-600">Välj ett beskrivande namn, t.ex. "Inköp byggmaterial" eller "Försäljning konsulttjänster"</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium mb-2">Beskrivning:</p>
                          <p className="text-sm text-gray-600">Förklara när mallen ska användas</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium mb-2">Nyckelord:</p>
                          <p className="text-sm text-gray-600">Ord som hjälper AI:n att välja rätt mall, t.ex. "byggmaterial, virke, betong"</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step3">
                    <AccordionTrigger>3. Lägg till bokföringsposter</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <p className="text-sm">För varje post anger du:</p>
                        <div className="grid gap-3">
                          <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                            <div className="w-20 text-xs font-medium">Konto:</div>
                            <div className="text-sm">Välj från BAS-kontoplanen</div>
                          </div>
                          <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                            <div className="w-20 text-xs font-medium">Typ:</div>
                            <div className="text-sm">Debet eller Kredit</div>
                          </div>
                          <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                            <div className="w-20 text-xs font-medium">Beskrivning:</div>
                            <div className="text-sm">Kort förklaring av posten</div>
                          </div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded">
                          <p className="text-orange-800 text-sm">
                            <strong>Tips:</strong> Börja med minst två poster - en debet och en kredit som balanserar varandra.
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step4">
                    <AccordionTrigger>4. Testa och förbättra</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">Efter att du skapat mallen:</p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                            Prova att beskriva transaktionen i chatten
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                            Se om AI:n väljer din mall automatiskt
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                            Justera nyckelord om nödvändigt
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-4 w-4" />
                    Exempel 1: Inköp av kontorsmaterial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Du köper papper och pennor för 500 kr (inkl. moms).</p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2 mb-2">
                        <div>Konto</div>
                        <div>Typ</div>
                        <div>Belopp</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-1">
                        <div>6110 - Kontorsmaterial</div>
                        <div className="text-green-600">Debet</div>
                        <div>400 kr</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-1">
                        <div>2640 - Ingående moms</div>
                        <div className="text-green-600">Debet</div>
                        <div>100 kr</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>1930 - Checkkonto</div>
                        <div className="text-red-600">Kredit</div>
                        <div>500 kr</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Logik: Kostnaden ökar (debet), moms kan dras av (debet), pengarna lämnar bankkontot (kredit)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Exempel 2: Kundbetalning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">En kund betalar sin faktura på 1 250 kr.</p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2 mb-2">
                        <div>Konto</div>
                        <div>Typ</div>
                        <div>Belopp</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-1">
                        <div>1930 - Checkkonto</div>
                        <div className="text-green-600">Debet</div>
                        <div>1 250 kr</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>1510 - Kundfordringar</div>
                        <div className="text-red-600">Kredit</div>
                        <div>1 250 kr</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Logik: Pengarna kommer in på bankkontot (debet), kundfordringen minskar (kredit)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building className="h-4 w-4" />
                    Exempel 3: Hyresbetalning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Du betalar månadshyran på 8 000 kr.</p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2 mb-2">
                        <div>Konto</div>
                        <div>Typ</div>
                        <div>Belopp</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-1">
                        <div>5010 - Lokalhyror</div>
                        <div className="text-green-600">Debet</div>
                        <div>8 000 kr</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>1930 - Checkkonto</div>
                        <div className="text-red-600">Kredit</div>
                        <div>8 000 kr</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Logik: Kostnaden för hyra ökar (debet), pengarna lämnar bankkontot (kredit)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mt-6">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Tips för framgång:
              </h4>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• Börja med enkla mallar och bygg upp komplexiteten gradvis</li>
                <li>• Använd tydliga nyckelord som du naturligt skulle använda</li>
                <li>• Testa mallarna genom att beskriva transaktioner i chatten</li>
                <li>• Ta hjälp av AI:n om du är osäker på vilka konton som ska användas</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
