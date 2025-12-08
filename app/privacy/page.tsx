"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="GTaskALL"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-semibold">GTaskALL</span>
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 8, 2025</p>

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
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Client-Side Operation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Important:</strong> GTaskALL is a fully client-side application that runs entirely in your browser.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>No Server Storage:</strong> We do not store any of your tasks, task data, or personal information on our servers</li>
              <li><strong>Direct API Connection:</strong> All task data is retrieved directly from Google&apos;s servers and displayed in real-time</li>
              <li><strong>Local Storage Only:</strong> Authentication tokens are stored locally in your browser&apos;s storage to maintain your session and support multiple account functionality</li>
              <li><strong>No External Servers:</strong> Aside from Google&apos;s APIs, your data is never sent to any external servers</li>
            </ul>
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
            <p className="text-muted-foreground leading-relaxed mb-4">
              GTaskALL uses your browser&apos;s local storage to enhance your experience:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Authentication Tokens:</strong> Securely stored to keep you logged in</li>
              <li><strong>Account Data:</strong> Remember your connected Google accounts for quick access</li>
              <li><strong>Theme Preferences:</strong> Save your dark/light mode preference</li>
              <li><strong>UI State:</strong> Remember sidebar width and view preferences</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              All data in local storage can be cleared at any time through your browser settings.
            </p>
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
              If you have any questions about this Privacy Policy, data privacy concerns, or our practices, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong>{" "}
              <a href="mailto:beny18241@gmail.com" className="text-primary hover:underline">
                beny18241@gmail.com
              </a>
            </p>
            <p className="text-muted-foreground mt-2">
              We aim to respond to all privacy-related inquiries within 48 hours.
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
