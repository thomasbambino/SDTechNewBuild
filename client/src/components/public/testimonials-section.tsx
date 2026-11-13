import { useContent } from "@/hooks/use-content";
import { Star, StarHalf } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";

interface Testimonial {
  content: string;
  name: string;
  company: string;
}

export default function TestimonialsSection() {
  const { content, isLoading } = useContent();

  if (isLoading) {
    return (
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-secondary-50 p-6 rounded-lg shadow border border-secondary-100">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-200 mr-4"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Extract content values with fallbacks
  const title = content?.testimonials?.title || "What Our Clients Say";
  const subtitle = content?.testimonials?.subtitle || "Don't just take our word for it. Here's what our clients have to say about working with us.";
  const testimonials: Testimonial[] = content?.testimonials?.items || [
    {
      content: "SD Tech Pros transformed our business with their custom software solution. The team was professional, responsive, and delivered exactly what we needed on time and within budget.",
      name: "John Smith",
      company: "CEO, TechCorp Inc."
    },
    {
      content: "We've been working with SD Tech Pros for over three years now, and they continue to impress us with their technical expertise and dedication to customer service.",
      name: "Sarah Johnson",
      company: "CTO, InnovateNow"
    },
    {
      content: "The cybersecurity assessment provided by SD Tech Pros identified several critical vulnerabilities in our system. Their remediation plan was thorough and effective.",
      name: "Michael Rodriguez",
      company: "IT Director, Global Bank"
    }
  ];

  // Helper component for star ratings
  const StarRating = () => (
    <div className="text-primary-400 flex">
      <Star className="fill-current" />
      <Star className="fill-current" />
      <Star className="fill-current" />
      <Star className="fill-current" />
      <Star className="fill-current" />
    </div>
  );

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-secondary-800 mb-4">
            {title}
          </h2>
          <p className="max-w-3xl mx-auto text-xl text-secondary-500">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-secondary-50 p-6 rounded-lg shadow border border-secondary-100">
              <div className="flex items-center mb-4">
                <StarRating />
              </div>
              <p className="text-secondary-600 mb-6">
                "{testimonial.content}"
              </p>
              <div className="flex items-center">
                <Monogram name={testimonial.name} className="mr-4" />
                <div>
                  <h4 className="font-semibold text-secondary-800">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-secondary-500">
                    {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
