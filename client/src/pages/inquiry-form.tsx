import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  User, 
  RefreshCw, 
  CheckCircle 
} from "lucide-react";

// Inquiry form schema
const inquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  service: z.string().min(1, "Please select a service"),
  budget: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

export default function InquiryForm() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { data: settings } = useQuery<{ logoPath?: string; companyName?: string }>({
    queryKey: ["/api/settings/public"],
  });
  
  // Available services
  const serviceOptions = [
    { value: "web_development", label: "Web Development" },
    { value: "custom_software", label: "Custom Software" },
    { value: "it_consulting", label: "IT Consulting" },
    { value: "data_analytics", label: "Data Analytics" },
    { value: "other", label: "Other Services" },
  ];
  
  // Budget options
  const budgetOptions = [
    { value: "less_than_5k", label: "Less than $5,000" },
    { value: "5k_to_10k", label: "$ 5,000 - $ 10,000" },
    { value: "10k_to_25k", label: "$ 10,000 - $ 25,000" },
    { value: "25k_to_50k", label: "$ 25,000 - $ 50,000" },
    { value: "more_than_50k", label: "More than $ 50,000" },
    { value: "not_sure", label: "Not sure yet" },
  ];
  
  // Form hook
  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "",
      budget: "not_sure",
      message: "",
    },
  });
  
  // Submit inquiry mutation
  const submitInquiryMutation = useMutation({
    mutationFn: async (data: InquiryFormValues) => {
      // Transform the form data to match the API schema
      const inquiryData = {
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        message: `Service: ${data.service}\nBudget: ${data.budget}\n\n${data.message}`,
      };
      
      const res = await apiRequest("POST", "/api/inquiries", inquiryData);
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      form.reset();
      toast({
        title: "Inquiry submitted successfully",
        description: "We'll get back to you as soon as possible.",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: InquiryFormValues) => {
    submitInquiryMutation.mutate(data);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <div className="mx-auto flex items-center">
              {settings?.logoPath ? (
                <img
                  src={settings.logoPath}
                  alt={settings.companyName || "Logo"}
                  className="h-8 max-w-[160px] object-contain"
                />
              ) : (
                <>
                  <span className="bg-primary text-primary-foreground font-bold text-xl px-2 py-1 rounded mr-2">SD</span>
                  <span className="text-primary font-semibold text-lg">Tech Pros</span>
                </>
              )}
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          {isSubmitted ? (
            <Card className="border-green-100">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Inquiry Submitted Successfully!</CardTitle>
                <CardDescription>Thank you for reaching out to SD Tech Pros</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-600">
                  We've received your inquiry and our team will review it shortly. You can expect to hear from us within 1-2 business days.
                </p>
                <div className="py-4">
                  <div className="h-px bg-gray-200 w-full"></div>
                </div>
                <p className="text-gray-500">
                  In the meantime, feel free to explore our website for more information about our services.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  Return to Home
                </Button>
                <Button 
                  onClick={() => setIsSubmitted(false)}
                >
                  Submit Another Inquiry
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">Get in Touch</CardTitle>
                    <CardDescription>
                      Fill out the form below to discuss your project with our team
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                      <User className="text-gray-400 h-5 w-5" />
                                    </div>
                                    <Input placeholder="John Doe" className="pl-10" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                      <Mail className="text-gray-400 h-5 w-5" />
                                    </div>
                                    <Input type="email" placeholder="you@example.com" className="pl-10" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number (Optional)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                      <Phone className="text-gray-400 h-5 w-5" />
                                    </div>
                                    <Input placeholder="(555) 123-4567" className="pl-10" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="service"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Service Interested In</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a service" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {serviceOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="budget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Budget</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a budget range" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {budgetOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                This helps us understand the scope of your project
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Tell us about your project and requirements..." 
                                  className="resize-none min-h-[120px]" 
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={submitInquiryMutation.isPending}
                        >
                          {submitInquiryMutation.isPending ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Inquiry"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-primary mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium">Email</p>
                        <a href="mailto:contact@sdtechpros.com" className="text-gray-600 hover:text-primary">
                          contact@sdtechpros.com
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-primary mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <a href="tel:(555)123-4567" className="text-gray-600 hover:text-primary">
                          (555) 123-4567
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-4">
                      <li className="flex">
                        <div className="flex-shrink-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                          1
                        </div>
                        <p className="text-gray-600">
                          <span className="font-medium text-gray-900">Submit your inquiry</span> with details about your project
                        </p>
                      </li>
                      
                      <li className="flex">
                        <div className="flex-shrink-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                          2
                        </div>
                        <p className="text-gray-600">
                          <span className="font-medium text-gray-900">Initial consultation</span> with our team to discuss your needs
                        </p>
                      </li>
                      
                      <li className="flex">
                        <div className="flex-shrink-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                          3
                        </div>
                        <p className="text-gray-600">
                          <span className="font-medium text-gray-900">Receive a proposal</span> with timeline and pricing details
                        </p>
                      </li>
                      
                      <li className="flex">
                        <div className="flex-shrink-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white font-medium text-sm mr-3">
                          4
                        </div>
                        <p className="text-gray-600">
                          <span className="font-medium text-gray-900">Start your project</span> with our experienced team
                        </p>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-6 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} SD Tech Pros. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
