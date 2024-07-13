import {
  Plugin,
  Notice,
  EditorPosition,
  Editor,
  addIcon,
  MarkdownView,
} from "obsidian";

interface Correction {
  original: string;
  corrected: string[];
  help: string;
}

interface SentenceData {
  str: string;
  errInfo: ErrorInfo[];
}

interface ErrorInfo {
  orgStr: string;
  candWord: string;
  help: string;
}

const CORS_PROXY = "https://corsproxy.io/?";

addIcon(
  "han-spellchecker",
  `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18" fill="currentColor"><path d="M3.6,3.9c1.3,0,2.9,0,4.2,0,.7,0,2.3-.5,2.3.7,0,.3-.3.5-.6.5-2.2,0-4.6.2-6.8,0-.4,0-.7-.4-.8-.8-.2-.7,1.2-.7,1.5-.4h0ZM6.1,11c-4.2,0-3.7-5.8.7-5.2,3.7.2,3.1,5.6-.5,5.2h-.2ZM3.6,1.6c.7,0,1.5.4,2.3.4.8.1,1.6,0,2.4,0,.8,1.2-1.4,1.5-2.9,1.3-.9,0-2.7-.8-1.9-1.7h0ZM6.3,9.7c2.5,0,1.9-3.4-.6-2.8-1.2.2-1.4,1.8-.5,2.4.2.2.9.2,1,.3h0ZM4.9,13.2c-.1-1.2,1.5-.9,1.6.1.4,1.5-.2,2.3,2,2.1,1,0,6.7-.6,5,1.1-2.3.5-5.4.7-7.6-.3-.6-.8-.3-2.2-.9-3h0ZM11.3,1.1c2.6-.3,1.5,3.8,2,5,.6.4,2.6-.5,2.8.7,0,.4-.3.6-.6.7-.7.1-1.6,0-2.3.1-.2.1,0,.5-.1,1.1,0,1,0,4.2-.8,4.2-.2,0-.5-.3-.6-.6-.3-1.4,0-3.4,0-5,0-1.9,0-3.8-.2-4.6-.1-.4-.5-1.2-.1-1.5h.1Z"/></svg>`
);

async function checkSpelling(
  text: string
): Promise<{ resultOutput: string; corrections: Correction[] }> {
  const targetUrl = "http://speller.cs.pusan.ac.kr/results";
  const response = await fetch(`${CORS_PROXY}${targetUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ text1: text.replace(/\n/g, "\r") }),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.text();
  return parseSpellingResults(data);
}

function parseSpellingResults(html: string): {
  resultOutput: string;
  corrections: Correction[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const scriptTag = Array.from(doc.scripts).find((script) =>
    script.text.includes("data = ")
  );
  if (scriptTag) {
    const jsonStringMatch = scriptTag.text.match(/data = (\[.*?\]);/);
    if (jsonStringMatch && jsonStringMatch[1]) {
      const resultData: SentenceData[] = JSON.parse(jsonStringMatch[1]);
      return formatSpellingResults(resultData);
    }
  }
  return { resultOutput: "결과를 파싱할 수 없습니다.", corrections: [] };
}

function formatSpellingResults(resultData: SentenceData[]): {
  resultOutput: string;
  corrections: Correction[];
} {
  let resultOutput = "";
  const corrections: Correction[] = [];
  resultData.forEach((sentenceData, index) => {
    let highlightedText = sentenceData.str;
    sentenceData.errInfo.forEach((err, errIndex) => {
      highlightedText = replaceFirstOccurrenceWithPlaceholder(
        highlightedText,
        err.orgStr,
        `{placeholder_${index}_${errIndex}}`
      );
      const correction: Correction = {
        original: err.orgStr,
        corrected: err.candWord.split("|"),
        help: decodeHtmlEntities(err.help),
      };
      corrections.push(correction);
    });
    resultOutput += `문장 ${index + 1}: ${highlightedText}\n`;
  });
  return { resultOutput, corrections };
}

function replaceFirstOccurrenceWithPlaceholder(
  text: string,
  search: string,
  placeholder: string
): string {
  const index = text.indexOf(search);
  if (index === -1) return text;
  return text.slice(0, index) + placeholder + text.slice(index + search.length);
}

function decodeHtmlEntities(text: string): string {
  const element = document.createElement("div");
  element.innerHTML = text;
  return element.textContent || "";
}

function highlightOriginalTextWithPlaceholders(
  text: string,
  corrections: Correction[],
  type: string
): string {
  corrections.forEach((correction, index) => {
    text = replaceFirstOccurrenceWithPlaceholder(
      text,
      correction.original,
      `{placeholder_${index}}`
    );
  });
  corrections.forEach((correction, index) => {
    text = text.replace(
      `{placeholder_${index}}`,
      `<span id="${type}_correction${index}" style="color: var(--color-red); font-weight: bold;">${correction.original}</span>`
    );
  });
  return text;
}

function highlightCorrectedText(corrections: Correction[]): void {
  corrections.forEach((correction, index) => {
    const selectedOptionElement = document.querySelector(
      `input[name="correction${index}"]:checked`
    ) as HTMLInputElement;
    const selectedOption = selectedOptionElement
      ? selectedOptionElement.value
      : correction.original;
    const customTextElement = document.getElementById(
      `customCorrection${index}`
    ) as HTMLInputElement;
    const customText = customTextElement ? customTextElement.value.trim() : "";

    let correctionText: string;

    if (selectedOption === "custom") {
      correctionText = customText || correction.original;
    } else {
      correctionText = selectedOption;
    }

    const spanElement = document.getElementById(`preview_correction${index}`);
    if (spanElement) {
      spanElement.innerHTML = correctionText;
      spanElement.style.color =
        correctionText === correction.original
          ? "var(--color-red)"
          : "var(--color-blue)";
    }
  });
}

function createCorrectionPopup(
  corrections: Correction[],
  selectedText: string,
  start: EditorPosition,
  end: EditorPosition,
  editor: Editor
) {
  const themeClass = document.body.classList.contains("theme-light")
    ? "light"
    : "dark";

  const popupHtml = `
    <div id="correctionPopup" class="${themeClass}">
        <div class="header">
            <button id="applyCorrectionsButton">적용</button>
            <h2>맞춤법 검사 결과</h2>
            <button id="closePopupButton">닫기</button>
        </div>
        <div class="preview-container">
            <div class="error-text">${highlightOriginalTextWithPlaceholders(
              selectedText,
              corrections,
              "error"
            )}</div>
            <div class="arrow">►</div>
            <div id="resultPreview" class="result-preview">${highlightOriginalTextWithPlaceholders(
              selectedText,
              corrections,
              "preview"
            )}</div>
        </div>
        <div class="content">
            <div id="correctionUI" class="correction-list">
                ${corrections
                  .map(
                    (correction, index) => `
                <div class="correction-item">
                    <b>오류 ${index + 1}:</b> <span>${
                      correction.original
                    }</span><br>
                    <b>수정:</b>
                    ${correction.corrected
                      .map(
                        (option, optIndex) => `
                        <input type="radio" name="correction${index}" value="${option}" id="correction${index}_${optIndex}">
                        <label for="correction${index}_${optIndex}">${option}</label>
                    `
                      )
                      .join("")}
                    <input type="radio" name="correction${index}" value="${
                      correction.original
                    }" id="correction${index}_original" checked>
                    <label for="correction${index}_original">원본 유지</label>
                    <div class="correction-options">
                        <input type="radio" name="correction${index}" value="custom" id="correction${index}_custom">
                        <label for="correction${index}_custom">직접 수정:</label>
                        <input type="text" id="customCorrection${index}" placeholder="직접 수정 내용을 입력하세요" onfocus="document.getElementById('correction${index}_custom').checked = true;">
                    </div>
                    <pre>${correction.help}</pre>
                </div>
                `
                  )
                  .join("")}
            </div>
        </div>
        <div class="info-box">
            <p><a href="http://nara-speller.co.kr/speller/">한국어 맞춤법/문법 검사기</a>는 부산대학교 인공지능연구실과 (주)나라인포테크가 함께 만들고 있습니다.<br />이 검사기는 개인이나 학생만 무료로 사용할 수 있습니다.</p>
        </div>
    </div>`;

  const popup = document.createElement("div");
  popup.innerHTML = popupHtml;
  document.body.appendChild(popup);

  function closePopup() {
    document.getElementById("correctionPopup")?.remove();
    document.removeEventListener("keydown", escKeyListener);
  }

  function updatePreview() {
    highlightCorrectedText(corrections);
  }

  document.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("click", updatePreview);
  });
  document.querySelectorAll('input[type="text"]').forEach((input) => {
    input.addEventListener("input", updatePreview);
  });

  document
    .getElementById("applyCorrectionsButton")
    ?.addEventListener("click", () => {
      corrections.forEach((correction, index) => {
        const selectedOptionElement = document.querySelector(
          `input[name="correction${index}"]:checked`
        ) as HTMLInputElement;
        const selectedOption = selectedOptionElement
          ? selectedOptionElement.value
          : correction.original;
        const customTextElement = document.getElementById(
          `customCorrection${index}`
        ) as HTMLInputElement;
        const customText = customTextElement
          ? customTextElement.value.trim()
          : "";

        let correctionText: string;

        if (selectedOption === "custom") {
          correctionText = customText || correction.original;
        } else {
          correctionText = selectedOption;
        }

        const spanElement = document.getElementById(
          `preview_correction${index}`
        );
        if (spanElement) {
          spanElement.outerHTML = correctionText;
        }
      });

      editor.replaceRange("", start, end);
      editor.replaceRange(
        document
          .getElementById("resultPreview")
          ?.innerHTML.replace(/<\/?span[^>]*>/g, "") || "",
        start
      );

      closePopup();
    });

  document
    .getElementById("closePopupButton")
    ?.addEventListener("click", closePopup);

  function escKeyListener(event: KeyboardEvent) {
    if (event.key === "Escape") {
      closePopup();
    }
  }

  document.addEventListener("keydown", escKeyListener);

  updatePreview();
}

export default class SpellingPlugin extends Plugin {
  async onload() {
    this.addRibbonIcon("han-spellchecker", "Check Spelling", async () => {
      const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
      const editor = markdownView?.editor;
      if (!editor) {
        new Notice("에디터를 찾을 수 없습니다.");
        return;
      }

      const selectedText = editor.getSelection();
      if (!selectedText) {
        new Notice("선택된 텍스트가 없습니다.");
        return;
      }

      const cursorStart = editor.getCursor("from");
      const cursorEnd = editor.getCursor("to");

      if (!cursorStart || !cursorEnd) {
        new Notice("텍스트의 시작 또는 끝 위치를 가져올 수 없습니다.");
        return;
      }

      editor.setCursor(cursorEnd);

      let resultOutput, corrections;
      try {
        ({ resultOutput, corrections } = await checkSpelling(selectedText));
      } catch (error) {
        new Notice("맞춤법 검사를 수행할 수 없습니다.");
        console.error(error);
        return;
      }

      if (resultOutput === "" && corrections.length === 0) {
        new Notice("수정할 것이 없습니다. 훌륭합니다!");
      } else {
        createCorrectionPopup(
          corrections,
          selectedText,
          cursorStart,
          cursorEnd,
          editor
        );
      }
    });

    this.addCommand({
      id: "check-spelling",
      name: "Check Spelling",
      editorCallback: async (editor) => {
        const selectedText = editor.getSelection();
        if (!selectedText) {
          new Notice("선택된 텍스트가 없습니다.");
          return;
        }

        const cursorStart = editor.getCursor("from");
        const cursorEnd = editor.getCursor("to");

        if (!cursorStart || !cursorEnd) {
          new Notice("텍스트의 시작 또는 끝 위치를 가져올 수 없습니다.");
          return;
        }

        editor.setCursor(cursorEnd);

        let resultOutput, corrections;
        try {
          ({ resultOutput, corrections } = await checkSpelling(selectedText));
        } catch (error) {
          new Notice("맞춤법 검사를 수행할 수 없습니다.");
          console.error(error);
          return;
        }

        if (resultOutput === "" && corrections.length === 0) {
          new Notice("수정할 것이 없습니다. 훌륭합니다!");
        } else {
          createCorrectionPopup(
            corrections,
            selectedText,
            cursorStart,
            cursorEnd,
            editor
          );
        }
      },
    });
  }

  onunload() {}
}
