"use client";

import { useState } from "react";
import { Icon } from "@/app/ui/nova/nova-icons";

export function NovaNewsletter() {
  const [done, setDone] = useState(false);
  return (
    <section className="section newsletter-section" id="newsletter">
      <div className="wrap">
        <div className="news">
          <div className="news-watermark" aria-hidden="true">NOVA</div>
          <div className="news-copy">
            <span className="news-kicker">Nova Dispatch / 01</span>
            <h2>
              Good tech.<br />Before everyone else.
            </h2>
          </div>

          <div className="news-signup">
            <p>
              Product drops, private offers, and sharp recommendations—sent only
              when they&apos;re worth opening.
            </p>
            <form
              className="news-form"
              onSubmit={(e) => {
                e.preventDefault();
                setDone(true);
              }}
            >
              {done ? (
                <div className="news-done" role="status">
                  <span><Icon name="check" size={18} sw={2.2} /></span>
                  <div>
                    <strong>You&apos;re on the list.</strong>
                    <small>Watch your inbox for the next Nova drop.</small>
                  </div>
                </div>
              ) : (
                <>
                  <label className="news-field" htmlFor="newsletter-email">
                    <Icon name="mail" size={19} />
                    <span className="sr-only">Email address</span>
                    <input
                      id="newsletter-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Email address"
                    />
                  </label>
                  <button className="news-submit" type="submit">
                    Join the list <Icon name="arrow" size={18} sw={2} />
                  </button>
                </>
              )}
            </form>
            <div className="news-benefits" aria-label="Newsletter benefits">
              <span><Icon name="check" size={14} /> Early access</span>
              <span><Icon name="check" size={14} /> Members-only pricing</span>
              <span>No noise. Unsubscribe anytime.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
