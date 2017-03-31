module.exports = ({ boxes }) => `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">

    <title>Parallel Run</title>

    <style>
      @font-face {
        font-family: bg-light;
        src: url(/static/fonts/bd-light.woff2);
      }

      body {
        margin: 0;
        padding: 0;
      }

      main {
        display: flex;
        height: 100%;
        width: 100%;
        word-wrap: break-word;
        flex-direction: column;
      }

      main > section {
        height: ${100 / boxes.length}vh;
        width: 100vw;
        display: flex;
        flex-direction: column;
        overflow: auto;
        border-top: 2px solid #CCC;
        box-sizing: border-box;
        flex-shrink: 1;
        flex-grow: 0;
      }

      section:first-child {
        border-top: none;
      }

      section.fullscreen {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        z-index: 100000;
        background-color: #FFF;
      }

      .tools {
        font-size: 11px;
        font-family: bg-light;
        text-transform: uppercase;
        position: sticky;
        top: 0;
        left: 0;
        background-color: #FFF;
        border: none;
        border-bottom: 1px solid #EEE;
        min-height: 40px;
        flex-shrink: 0;
        display: flex;
      }

      .tools span {
        margin-left: -3px;
        background: #FFF;
        display: block;
        height: 22px;
        padding: 9px;
        font-size: 15px;
        text-transform: lowercase;
      }

      section > pre {
        padding: 20px;
        box-sizing: border-box;
      }

      button.fullscreen {
        cursor: pointer;
        -webkit-appearance: none;
        border: none;
        background: #EEE;
        padding: 13px;
        text-transform: uppercase;
        font-size: 12px;
        color: #4c4c4c;
      }
    </style>
  </head>
  <body>
    <main>
      ${!boxes.length ? `
        <h1>No processes running</h1>
      ` : ``}

      ${boxes.map((box, i) => `
        <section id="sink${i}">
          <div class="tools">
            <button onclick="this.parentNode.parentNode.classList.toggle('fullscreen')" class="fullscreen">fullscreen</button>
            <span>${box.label}</span>
          </div>
          <pre><code>${box.sink.output}</code></pre>
        </section>
      `).join('\n')}
    </main>

    <!--
         This is an experimental usage of xterm.js to render pretty terminals
         in the browser. They didn't work well with our stdout for some reason
         though, and caused massive amounts of line breaks. I've disabled it
         for now, but want to keep the code here for a commit or two to make
         it easier to find.
    -->

    <!--
    <script>
      ${boxes.map((box, i) => `
        const sink${i} = new Terminal({
          colorBlink: false,
          cols: 120,
          tabStopWidth: 2,
        });
        sink${i}.open(document.querySelector('#sink${i}'));
        sink${i}.fit();
        sink${i}.write(atob('${new Buffer(box.sink.output).toString('base64')}'));
      `).join('\n')}
    </script>
    -->

    <script>
      [...document.querySelectorAll('section')].forEach(section => {
        section.scrollTop = Number.MAX_SAFE_INTEGER;
      });
    </script>
  </body>
  </html>
`;
