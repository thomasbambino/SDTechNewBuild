import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import {
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  Check,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Code,
  BarChart,
  Layout,
  Users,
  Star,
  Globe,
  Database,
  Shield,
  Zap,
  Settings,
  Monitor,
  Smartphone,
  Wrench,
} from "lucide-react";

const SERVICE_ICON_MAP: Record<string, React.ReactNode> = {
  layout:     <Layout className="h-8 w-8" />,
  code:       <Code className="h-8 w-8" />,
  briefcase:  <Briefcase className="h-8 w-8" />,
  barChart:   <BarChart className="h-8 w-8" />,
  globe:      <Globe className="h-8 w-8" />,
  database:   <Database className="h-8 w-8" />,
  shield:     <Shield className="h-8 w-8" />,
  zap:        <Zap className="h-8 w-8" />,
  settings:   <Settings className="h-8 w-8" />,
  monitor:    <Monitor className="h-8 w-8" />,
  users:      <Users className="h-8 w-8" />,
  smartphone: <Smartphone className="h-8 w-8" />,
  wrench:     <Wrench className="h-8 w-8" />,
};

interface ContentSection {
  id: number;
  type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  imagePath: string | null;
  order: number;
  isActive: boolean;
}

function QuickInquiryForm() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/inquiries", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    mutation.mutate();
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Received!</h3>
        <p className="text-gray-600 text-sm">We'll be in touch within 1–2 business days.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setSubmitted(false)}>Send Another</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Inquiry</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="qi-name">Name <span className="text-red-500">*</span></Label>
            <Input id="qi-name" placeholder="Your name" className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="qi-phone">Phone</Label>
            <Input id="qi-phone" type="tel" placeholder="(555) 123-4567" className="mt-1" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label htmlFor="qi-email">Email <span className="text-red-500">*</span></Label>
          <Input id="qi-email" type="email" placeholder="you@example.com" className="mt-1" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        </div>
        <div>
          <Label htmlFor="qi-message">Message <span className="text-red-500">*</span></Label>
          <textarea
            id="qi-message"
            placeholder="How can we help you?"
            className="w-full min-h-[100px] mt-1 px-3 py-2 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send Message"}
        </Button>
      </form>
    </div>
  );
}

export default function PublicHome() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings/public']
  });
  
  // Fetch content sections
  const { data: heroContent = [], isLoading: heroLoading } = useQuery<ContentSection[]>({
    queryKey: ['/api/content/hero']
  });
  const { data: serviceContent = [] } = useQuery<ContentSection[]>({
    queryKey: ['/api/content/service']
  });
  const { data: aboutContent = [] } = useQuery<ContentSection[]>({
    queryKey: ['/api/content/about']
  });
  const { data: testimonialContent = [] } = useQuery<ContentSection[]>({
    queryKey: ['/api/content/testimonial']
  });

  // Testimonial header detection: if first item has no content it's a section header
  const allTestimonials = testimonialContent ?? [];
  const testimonialHasHeader = allTestimonials.length > 0 && !allTestimonials[0].content;
  const testimonialSectionTitle = testimonialHasHeader ? (allTestimonials[0].title || "What Our Clients Say") : "What Our Clients Say";
  const testimonialSectionSubtitle = testimonialHasHeader ? (allTestimonials[0].subtitle || "Don't just take our word for it. Hear from some of our satisfied clients.") : "Don't just take our word for it. Hear from some of our satisfied clients.";
  const testimonialItems = testimonialHasHeader ? allTestimonials.slice(1) : allTestimonials;


  // Navigation links
  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Services", href: "#services" },
    { name: "About Us", href: "#about" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Contact", href: "#contact" }
  ];

  const companyInfo = {
    email: settings?.contactEmail || "contact@sdtechpros.com",
    phone: settings?.contactPhone || "(555) 123-4567",
    address: settings?.contactAddress || "123 Tech Street, San Diego, CA 92101",
  };

  // Handle scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href="#home" className="flex items-center">
                {settings?.logoPath ? (
                  <img
                    src={settings.logoPath}
                    alt={settings.companyName || "Logo"}
                    className="h-8 max-w-[160px] object-contain mr-2"
                  />
                ) : (
                  <>
                    <span className="bg-primary text-primary-foreground font-bold text-xl px-2 py-1 rounded mr-2">SD</span>
                    <span className="text-primary font-semibold text-lg hidden md:block">Tech Pros</span>
                  </>
                )}
              </a>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.href.substring(1));
                  }}
                  className="text-gray-600 hover:text-primary font-medium"
                >
                  {link.name}
                </a>
              ))}
            </nav>
            
            {/* Mobile Menu & Client Portal Button */}
            <div className="flex items-center space-x-4">
              {user ? (
                <Button
                  onClick={() => navigate(user.role === "admin" ? "/admin" : "/client")}
                  className="hidden md:inline-flex"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/auth")}
                  variant="default"
                  className="hidden md:inline-flex"
                >
                  Client Portal
                </Button>
              )}
              
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader className="text-left">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-8 flex flex-col space-y-4">
                    {navLinks.map((link) => (
                      <a
                        key={link.name}
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollToSection(link.href.substring(1));
                        }}
                        className="flex items-center py-2 text-lg text-gray-700 hover:text-primary"
                      >
                        {link.name}
                        <ChevronRight className="ml-auto h-5 w-5" />
                      </a>
                    ))}
                    <div className="pt-4 border-t border-gray-100">
                      {user ? (
                        <Button
                          onClick={() => {
                            setIsMenuOpen(false);
                            navigate(user.role === "admin" ? "/admin" : "/client");
                          }}
                          className="w-full"
                        >
                          Go to Dashboard
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setIsMenuOpen(false);
                            navigate("/auth");
                          }}
                          className="w-full"
                        >
                          Client Portal
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="home" className="pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                {heroLoading ? (
                  <div className="space-y-4 mb-8">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-4/5" />
                    <Skeleton className="h-6 w-full mt-4" />
                    <Skeleton className="h-6 w-3/4" />
                  </div>
                ) : (
                  <>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  {heroContent?.[0]?.title}
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  {heroContent?.[0]?.subtitle}
                </p>
                  </>
                )}
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <Button
                    onClick={() => navigate("/inquiry")}
                    size="lg"
                    className="text-base"
                  >
                    {heroContent?.[0]?.content || "Get Started"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-base"
                    onClick={() => scrollToSection("services")}
                  >
                    Our Services
                  </Button>
                </div>
              </div>
              <div className="hidden md:flex justify-center">
                {heroContent[0]?.imagePath ? (
                  <img 
                    src={heroContent[0].imagePath} 
                    alt="SD Tech Pros Services" 
                    className="max-w-md rounded-lg shadow-xl"
                  />
                ) : (
                  <div className="w-full max-w-md aspect-video bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {serviceContent?.[0]?.title || "Our Services"}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {serviceContent?.[0]?.subtitle || "We offer a range of technology solutions to help your business grow and succeed."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {((serviceContent ?? []).slice(1)).map((service, index) => {
                const iconKey = service.imagePath?.startsWith('icon:') ? service.imagePath.slice(5) : null;
                const icon = iconKey
                  ? (SERVICE_ICON_MAP[iconKey] ?? <Briefcase className="h-8 w-8" />)
                  : <Briefcase className="h-8 w-8" />;
                return (
                <div
                  key={service.id || index}
                  className="bg-white rounded-lg shadow-md p-6 transition-transform hover:scale-105"
                >
                  <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                    {icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-600">
                    {service.content}
                  </p>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features/Benefits Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary-50 rounded-2xl p-8 md:p-12">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Why Choose SD Tech Pros?
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  We deliver exceptional technology solutions with a focus on quality, reliability, and client satisfaction.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <Check className="h-10 w-10 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Expertise & Experience</h3>
                  <p className="text-gray-600">
                    Our team of experienced professionals brings years of industry expertise to every project.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <Check className="h-10 w-10 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Custom Solutions</h3>
                  <p className="text-gray-600">
                    We create tailored technology solutions that address your specific business challenges.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <Check className="h-10 w-10 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Client-Focused Approach</h3>
                  <p className="text-gray-600">
                    We prioritize your needs and provide exceptional support throughout our partnership.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Us Section */}
        <section id="about" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  {aboutContent?.[0]?.title || "About SD Tech Pros"}
                </h2>
                <div className="prose prose-lg text-gray-600 max-w-none">
                  <p>{aboutContent?.[0]?.subtitle || "We're a team of passionate technology experts dedicated to helping businesses succeed."}</p>
                  <p>{aboutContent?.[0]?.content || "Founded in 2015, SD Tech Pros has been providing cutting-edge technology solutions to businesses of all sizes. Our mission is to empower organizations with the tools and expertise they need to thrive in today's digital landscape."}</p>
                  <p>Our values:</p>
                  <ul>
                    <li>Excellence in everything we do</li>
                    <li>Innovation and continuous improvement</li>
                    <li>Integrity and transparency</li>
                    <li>Building lasting client relationships</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-center">
                {aboutContent[0]?.imagePath ? (
                  <img 
                    src={aboutContent[0].imagePath} 
                    alt="About SD Tech Pros" 
                    className="rounded-lg shadow-xl max-w-md"
                  />
                ) : (
                  <div className="w-full max-w-md aspect-square bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                    <Users className="h-24 w-24 text-primary/40" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {testimonialSectionTitle}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {testimonialSectionSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonialItems.map((testimonial, index) => (
                <div
                  key={testimonial.id || index}
                  className="bg-white rounded-lg shadow-md p-6 border border-gray-100"
                >
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.title}</p>
                    <p className="text-gray-500 text-sm">{testimonial.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
              Let's discuss how our technology solutions can help you achieve your business goals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                onClick={() => navigate("/inquiry")}
                variant="secondary"
                size="lg"
                className="text-base"
              >
                Get in Touch
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                size="lg"
                className="text-base bg-transparent text-white border-white hover:bg-white/10"
              >
                Client Portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Contact Us
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Have questions or ready to start a project? Get in touch with our team.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Mail className="h-6 w-6 text-primary mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <a href={`mailto:${companyInfo.email}`} className="text-gray-600 hover:text-primary">
                        {companyInfo.email}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-6 w-6 text-primary mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Phone</p>
                      <a href={`tel:${companyInfo.phone}`} className="text-gray-600 hover:text-primary">
                        {companyInfo.phone}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="h-6 w-6 text-primary mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Address</p>
                      <p className="text-gray-600">
                        {companyInfo.address}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <Button
                    onClick={() => navigate("/inquiry")}
                    size="lg"
                    className="text-base"
                  >
                    Send Us a Message
                  </Button>
                </div>
              </div>
              
              <QuickInquiryForm />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                {settings?.logoPath ? (
                  <img
                    src={settings.logoPath}
                    alt={settings.companyName || "Logo"}
                    className="h-8 max-w-[160px] object-contain brightness-0 invert"
                  />
                ) : (
                  <>
                    <span className="bg-white text-primary font-bold text-xl px-2 py-1 rounded mr-2">SD</span>
                    <span className="font-semibold text-lg">Tech Pros</span>
                  </>
                )}
              </div>
              <p className="text-gray-400 max-w-md">
                Professional technology solutions for businesses of all sizes. We help you transform through innovative software and strategic IT consulting.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.href.substring(1));
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <a href={`mailto:${companyInfo.email}`} className="hover:text-white transition-colors">
                    {companyInfo.email}
                  </a>
                </li>
                <li className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <a href={`tel:${companyInfo.phone}`} className="hover:text-white transition-colors">
                    {companyInfo.phone}
                  </a>
                </li>
                <li className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 mt-1" />
                  <span>{companyInfo.address}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} SD Tech Pros. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
