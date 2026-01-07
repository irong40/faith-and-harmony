import { useState } from "react";
import { ChevronDown, Plus, DollarSign, Clock, Briefcase, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HOURLY_RATES,
  AGENCY_RATES,
  PROJECT_RATES,
  TASK_ESTIMATES,
  GEOGRAPHIC_MODIFIERS,
  DISCOUNT_MODIFIERS,
  RUSH_MODIFIERS,
  CATEGORY_LABELS,
  getMidRate,
  formatRateRange,
  getHourlyRatesByCategory,
  getProjectRatesByCategory,
  getTaskEstimatesByCategory,
  type HourlyRate,
  type ProjectRate,
  type TaskEstimate,
} from "@/data/market-rates";

interface PricingItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
}

interface MarketRatesPanelProps {
  onAddPricingItem: (item: PricingItem) => void;
}

export function MarketRatesPanel({ onAddPricingItem }: MarketRatesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filterBySearch = <T extends { role?: string; type?: string; task?: string }>(
    items: T[]
  ): T[] => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.role?.toLowerCase().includes(term) ||
      item.type?.toLowerCase().includes(term) ||
      item.task?.toLowerCase().includes(term)
    );
  };

  const handleAddHourlyRate = (rate: HourlyRate, level: 'junior' | 'mid' | 'senior') => {
    const rateRange = rate[level];
    onAddPricingItem({
      description: `${rate.role} (${level})`,
      quantity: 1,
      unit: "hour",
      rate: getMidRate(rateRange),
    });
  };

  const handleAddProjectRate = (project: ProjectRate, tier: 'budget' | 'standard' | 'premium') => {
    const rateRange = project[tier];
    onAddPricingItem({
      description: `${project.type} (${tier})`,
      quantity: 1,
      unit: "project",
      rate: getMidRate(rateRange),
    });
  };

  const handleAddTaskEstimate = (task: TaskEstimate) => {
    onAddPricingItem({
      description: task.task,
      quantity: Math.round((task.hoursMin + task.hoursMax) / 2),
      unit: "hour",
      rate: Math.round((task.rateMin + task.rateMax) / (task.hoursMin + task.hoursMax)),
    });
  };

  const hourlyCategories = ['design', 'development', 'content', 'specialized'] as const;
  const projectCategories = ['websites', 'nonprofit', 'mobile', 'branding', 'documents', 'automation'];
  const taskCategories = ['development', 'design', 'content'] as const;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-muted/30">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium">Market Rates Reference</span>
            <Badge variant="secondary" className="text-xs">2024-2025</Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4">
        <div className="mb-4">
          <Input
            placeholder="Search rates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs defaultValue="hourly" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hourly" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 mr-1 hidden sm:inline" />
              Hourly
            </TabsTrigger>
            <TabsTrigger value="project" className="text-xs sm:text-sm">
              <Briefcase className="h-3 w-3 mr-1 hidden sm:inline" />
              Project
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs sm:text-sm">
              <DollarSign className="h-3 w-3 mr-1 hidden sm:inline" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="modifiers" className="text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 mr-1 hidden sm:inline" />
              Modifiers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hourly" className="mt-4 space-y-4 max-h-[400px] overflow-y-auto">
            {/* Agency Rates */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Agency Blended Rates</h4>
              <div className="grid gap-2">
                {AGENCY_RATES.map((agency) => (
                  <div key={agency.type} className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-sm font-medium">{agency.type}</span>
                    <span className="text-sm text-muted-foreground">{formatRateRange(agency.rate)}/hr</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly by Category */}
            {hourlyCategories.map((category) => {
              const rates = filterBySearch(getHourlyRatesByCategory(category));
              if (rates.length === 0) return null;
              
              return (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {CATEGORY_LABELS[category]}
                  </h4>
                  <div className="grid gap-2">
                    {rates.map((rate) => (
                      <div key={rate.role} className="p-3 bg-background rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{rate.role}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Junior</span>
                            <div className="flex items-center gap-1">
                              <span>{formatRateRange(rate.junior)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={() => handleAddHourlyRate(rate, 'junior')}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Mid</span>
                            <div className="flex items-center gap-1">
                              <span>{formatRateRange(rate.mid)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={() => handleAddHourlyRate(rate, 'mid')}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Senior</span>
                            <div className="flex items-center gap-1">
                              <span>{formatRateRange(rate.senior)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={() => handleAddHourlyRate(rate, 'senior')}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="project" className="mt-4 space-y-4 max-h-[400px] overflow-y-auto">
            {projectCategories.map((category) => {
              const projects = filterBySearch(getProjectRatesByCategory(category));
              if (projects.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {CATEGORY_LABELS[category]}
                  </h4>
                  <div className="grid gap-2">
                    {projects.map((project) => (
                      <div key={project.type} className="p-3 bg-background rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{project.type}</span>
                          {project.notes && (
                            <span className="text-xs text-muted-foreground">{project.notes}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Budget</span>
                            <div className="flex items-center gap-1">
                              <span>{formatRateRange(project.budget)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={() => handleAddProjectRate(project, 'budget')}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Standard</span>
                            <div className="flex items-center gap-1">
                              <span>{formatRateRange(project.standard)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={() => handleAddProjectRate(project, 'standard')}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Premium</span>
                            <div className="flex items-center gap-1">
                              <span>{formatRateRange(project.premium)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-5 w-5"
                                onClick={() => handleAddProjectRate(project, 'premium')}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-4 max-h-[400px] overflow-y-auto">
            {taskCategories.map((category) => {
              const tasks = filterBySearch(getTaskEstimatesByCategory(category));
              if (tasks.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    {CATEGORY_LABELS[category]}
                  </h4>
                  <div className="grid gap-2">
                    {tasks.map((task) => (
                      <div key={task.task} className="flex items-center justify-between p-3 bg-background rounded border">
                        <div>
                          <span className="font-medium text-sm">{task.task}</span>
                          <div className="text-xs text-muted-foreground">
                            {task.hoursMin}-{task.hoursMax} hrs • {formatRateRange({ min: task.rateMin, max: task.rateMax })}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleAddTaskEstimate(task)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="modifiers" className="mt-4 space-y-4 max-h-[400px] overflow-y-auto">
            {/* Geographic */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Geographic Adjustments</h4>
              <div className="grid gap-2">
                {GEOGRAPHIC_MODIFIERS.map((mod) => (
                  <div key={mod.name} className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-sm">{mod.name}</span>
                    <div className="text-right">
                      <Badge variant={mod.multiplier >= 1 ? "default" : "secondary"}>
                        {mod.multiplier}x
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">{mod.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discounts */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Discount Guidelines</h4>
              <div className="grid gap-2">
                {DISCOUNT_MODIFIERS.map((mod) => (
                  <div key={mod.name} className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-sm">{mod.name}</span>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {mod.multiplier === 0 ? 'Free' : `${mod.multiplier}x`}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">{mod.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rush Fees */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Rush Fee Guidelines</h4>
              <div className="grid gap-2">
                {RUSH_MODIFIERS.map((mod) => (
                  <div key={mod.name} className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-sm">{mod.name}</span>
                    <div className="text-right">
                      <Badge variant={mod.multiplier > 1 ? "destructive" : "default"}>
                        {mod.multiplier}x
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-2">{mod.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
