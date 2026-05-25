import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const sections = [
  { label: '📋 Prerequisites', path: '/notes_web/docs/prerequisite', description: 'REST API, gRPC, research papers, coding best practices' },
  { label: '☕ Java', path: '/notes_web/docs/java', description: 'Core Java, JVM internals, Spring ecosystem, OOP, Java 8-21' },
  { label: '🐍 Python', path: '/notes_web/docs/python', description: 'Fundamentals, OOP, async, testing, data science, AI agents' },
  { label: '🏛️ Architecture', path: '/notes_web/docs/architecture', description: 'System design, microservices, Kafka, messaging patterns' },
  { label: '🔗 Data & Integration', path: '/notes_web/docs/data-integration', description: 'Database design, SQL, NoSQL, messaging comparisons' },
  { label: '☁️ AWS', path: '/notes_web/docs/aws', description: 'IAM, VPC networking, S3, Glacier storage' },
  { label: '⚙️ DevOps', path: '/notes_web/docs/devops', description: 'Maven, Gradle, Docker, Kubernetes' },
  { label: '👥 Leadership', path: '/notes_web/docs/leadership', description: 'Technical leadership, team management' },
  { label: '🧮 DSA Patterns', path: '/notes_web/docs/dsa', description: 'Sliding window, two pointers, trees, DP, and 13 more patterns' },
  { label: '🤖 AI & Claude', path: '/notes_web/docs/AI', description: 'Agentic architecture, Claude Code workflows, prompt engineering' },
  { label: '💧 Elixir', path: '/notes_web/docs/elixir', description: 'BEAM/OTP, Phoenix, Ecto, GenServer, supervision trees' },
  { label: '📚 Case Studies', path: '/notes_web/docs/case-studies', description: 'Stripe, Razorpay, Keycloak, Kong, Zerodha integrations' },
  { label: '🎯 Interview Prep', path: '/notes_web/docs/interview-prep', description: 'Behavioral questions, interview strategies' },
];

function HeroSection() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">Software Dev Interview Prep</h1>
        <p className="hero__subtitle">
          A comprehensive knowledge base for senior engineering interviews — Java, System Design, DSA, Python, Elixir, AWS, and more.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/notes_web/docs/root">
            📖 Start Reading
          </Link>
          <Link className="button button--outline button--lg" to="/notes_web/docs/dsa">
            🧮 DSA Patterns
          </Link>
        </div>
      </div>
    </header>
  );
}

function SectionCard({ label, path, description }) {
  return (
    <Link to={path} className={styles.card}>
      <h3>{label}</h3>
      <p>{description}</p>
    </Link>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HeroSection />
      <main>
        <section className={styles.sectionGrid}>
          <div className="container">
            <h2 className={styles.sectionHeading}>Browse Topics</h2>
            <div className={styles.grid}>
              {sections.map((s) => (
                <SectionCard key={s.path} {...s} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
