import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - GTaskALL",
  description: "Privacy Policy for GTaskALL - Google Tasks Manager",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 7, 2024</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to GTaskALL (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how we collect, 
              use, and protect your information when you use our Google Tasks management application 
              available at task.mpindela.com (the &quot;Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you use GTaskALL, we access the following information through Google&apos;s OAuth 2.0:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Google Account Information:</strong> Your name, email address, and profile picture</li>
              <li><strong>Google Tasks Data:</strong> Your task lists and tasks (titles, descriptions, due dates, completion status)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information solely to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Display your Google Tasks in a user-friendly interface</li>
              <li>Allow you to create, edit, and manage your tasks</li>
              <li>Sync changes with your Google Tasks account</li>
              <li>Support multiple Google account connections</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              GTaskALL does <strong>not</strong> store your tasks on our servers. All task data is retrieved 
              directly from Google&apos;s servers and displayed in real-time. Authentication tokens are stored 
              locally in your browser to maintain your session and support multiple account functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do <strong>not</strong> sell, trade, or share your personal information with third parties. 
              Your data is only transmitted between your browser and Google&apos;s APIs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Google API Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              GTaskALL&apos;s use and transfer of information received from Google APIs adheres to the{" "}
              <a 
                href="https://developers.google.com/terms/api-services-user-data-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>HTTPS encryption for all data transmission</li>
              <li>OAuth 2.0 for secure authentication with Google</li>
              <li>No server-side storage of your personal data</li>
              <li>Automatic token refresh to maintain secure connections</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Disconnect your Google account(s) from GTaskALL at any time</li>
              <li>Revoke access through your{" "}
                <a 
                  href="https://myaccount.google.com/permissions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Account permissions
                </a>
              </li>
              <li>Clear local browser data to remove stored tokens</li>
              <li>Request information about how your data is processed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Cookies and Local Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              GTaskALL uses local browser storage to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Store authentication session data</li>
              <li>Remember your connected Google accounts</li>
              <li>Maintain your preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our practices, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@mpindela.com" className="text-primary hover:underline">
                privacy@mpindela.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} GTaskALL. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
