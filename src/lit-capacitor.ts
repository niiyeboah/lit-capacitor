import { LitElement, html, css, property } from 'lit-element';

export class LitCapacitor extends LitElement {
  @property({ type: String }) page = 'main';

  @property({ type: String }) title = '';

  static styles = css`
    :host {
      display: flex;
      min-height: 100vh;
      font-size: calc(10px + 2vmin);
      color: #1a2b42;
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
    }

    main {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: auto;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: space-around;
    }

    .logo > span {
      display: inline-block;
      font-size: 4em;
      padding: 0 0.5em;
    }

    .logo > img {
      height: 5em;
    }

    .app-footer {
      font-size: calc(12px + 0.5vmin);
      align-items: center;
    }

    .app-footer a {
      margin-left: 5px;
    }
  `;

  render() {
    return html`
      <main>
        <div class="logo">
          <img src="./assets/lit-element.png" />
          <span>+</span>
          <img src="./assets/capacitor.png" />
        </div>
        <h1>Lit Capacitor</h1>
      </main>
    `;
  }
}

customElements.define('lit-capacitor', LitCapacitor);
