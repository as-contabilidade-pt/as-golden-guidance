import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { Principles } from "@/components/site/Principles";
import { Services } from "@/components/site/Services";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";

const title = "AS | Contabilidade, Fiscalidade e Gestão em Viseu";
const description =
  "Contabilidade, fiscalidade e apoio à gestão em Viseu, com a Contabilista Certificada Andreia Sofia. Serviços presenciais e remotos para empresas e independentes.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <About />
        <Principles />
        <Services />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
