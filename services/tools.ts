
import { FunctionDeclaration, Type } from "@google/genai";

// --- Dummy Data & Helpers ---

export const DUMMY_EMAILS = [
  {
    id: "e1",
    from: "Elon M.",
    subject: "Re: Starship Updates",
    body: "The trajectory looks good. Can we schedule a review for the landing sequence tomorrow?",
    avatar: "https://picsum.photos/id/1/50/50"
  },
  {
    id: "e2",
    from: "Sarah Connor",
    subject: "Project Skynet",
    body: "We need to talk about the neural net processor timeline. It's moving too fast.",
    avatar: "https://picsum.photos/id/2/50/50"
  },
  {
    id: "e3",
    from: "Investments Team",
    subject: "Q4 Portfolio Review",
    body: "Attached is the summary of Q4 performance. We beat the S&P 500 by 12%. Let's discuss allocation.",
    avatar: "https://picsum.photos/id/4/50/50"
  }
];

export const DUMMY_CALENDAR = [
  {
    id: "c1",
    title: "Q4 Earnings Prep",
    time: "09:00 AM - 10:00 AM",
    participants: ["CFO", "Investor Relations"],
    location: "Boardroom"
  },
  {
    id: "c2",
    title: "Strategy Sync",
    time: "10:30 AM - 11:30 AM",
    participants: ["Alice (COO)", "Product Team"],
    location: "Conference Room A"
  },
  {
    id: "c3",
    title: "Lunch with Jensen",
    time: "12:30 PM - 1:30 PM",
    participants: ["Jensen Huang"],
    location: "Sushirrito"
  },
  {
    id: "c4",
    title: "Board Meeting",
    time: "02:00 PM - 04:00 PM",
    participants: ["Board Members"],
    location: "Executive Suite"
  }
];

export const generateMarketData = (ticker: string) => {
  const basePrice = Math.random() * 1000 + 50;
  const changePercent = (Math.random() * 10) - 4; // -4% to +6%
  const changeAmount = basePrice * (changePercent / 100);
  const history = Array.from({ length: 20 }, (_, i) => basePrice * (1 + (Math.random() * 0.1 - 0.05)));
  
  return {
    ticker: ticker.toUpperCase(),
    companyName: ticker.toUpperCase() === 'TSLA' ? 'Tesla, Inc.' : ticker.toUpperCase() === 'NVDA' ? 'NVIDIA Corp' : `${ticker.toUpperCase()} Corp`,
    price: parseFloat(basePrice.toFixed(2)),
    changeAmount: parseFloat(changeAmount.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: `${(Math.random() * 50 + 10).toFixed(1)}M`,
    peRatio: parseFloat((Math.random() * 50 + 10).toFixed(2)),
    marketCap: `${(Math.random() * 2 + 0.1).toFixed(1)}T`,
    history
  };
};

// --- Tool Declarations ---

export const toolsDeclaration: FunctionDeclaration[] = [
  {
    name: "display_email",
    description: "Search for and display a specific email on the user's canvas.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The sender name or subject keyword" }
      },
      required: ["query"]
    }
  },
  {
    name: "draft_email",
    description: "Draft a new email for the user. Display the draft on canvas for review.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING, description: "Who the email is for" },
        subject: { type: Type.STRING, description: "The subject line" },
        body: { type: Type.STRING, description: "The email content" }
      },
      required: ["recipient", "subject", "body"]
    }
  },
  {
    name: "send_email",
    description: "Send an email. Use this after drafting or if the user explicitly confirms sending.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipient: { type: Type.STRING },
        subject: { type: Type.STRING },
        body: { type: Type.STRING }
      },
      required: ["recipient", "subject", "body"]
    }
  },
  {
    name: "display_calendar",
    description: "Display the user's calendar schedule for today.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: "schedule_event",
    description: "Schedule a new event on the user's calendar and display the confirmation.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        time: { type: Type.STRING },
        participants: { type: Type.STRING }
      },
      required: ["title", "time"]
    }
  },
  {
    name: "generate_code",
    description: "Write and display code snippets on the canvas.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING },
        code: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["language", "code", "description"]
    }
  },
  {
    name: "create_image",
    description: "Generate an image based on a prompt and display it to the user.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: "A descriptive prompt for the image generation." },
        style: { type: Type.STRING, description: "The style (e.g., photorealistic, anime, oil painting)" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "take_screenshot",
    description: "Take a screenshot of what is currently visible on the camera. Returns the image data.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        caption: { type: Type.STRING, description: "A caption for the image based on what you see." }
      },
      required: ["caption"]
    }
  },
  {
    name: "search_folders",
    description: "Search through user files/folders for a specific document.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        filename: { type: Type.STRING, description: "The name or topic of the file to search for." }
      },
      required: ["filename"]
    }
  },
  {
    name: "create_note",
    description: "Create a sticky note or save a visual note. Use this to persist information for the executive.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A short title for the note" },
        content: { type: Type.STRING, description: "The main body text of the note" },
        attachmentUrl: { type: Type.STRING, description: "Optional: The data URL of a screenshot if this is a visual note." },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional: Tags for organizing the note (e.g., 'meeting', 'idea', 'finance')." }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "find_notes_by_tag",
    description: "Retrieve all notes that match a specific tag.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tag: { type: Type.STRING, description: "The tag to search for." }
      },
      required: ["tag"]
    }
  },
  {
    name: "display_notes",
    description: "Open the full-screen view of all saved notes.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: "visualize_data",
    description: "Create a bar chart to visualize data points.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title of the chart" },
        labels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Labels for the X-axis" },
        values: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Numerical values for the Y-axis" },
        summary: { type: Type.STRING, description: "A brief insight about the data" }
      },
      required: ["title", "labels", "values"]
    }
  },
  {
    name: "display_web_results",
    description: "Display a list of web search results on the canvas. Use this after finding information to show sources.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING },
        results: { 
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              snippet: { type: Type.STRING }
            }
          }
        }
      },
      required: ["query", "results"]
    }
  },
  // --- NEW EXECUTIVE TOOLS ---
  {
    name: "get_market_data",
    description: "Get real-time market data for a specific stock ticker (e.g., TSLA, AAPL, BTC). Displays a Financial Card.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ticker: { type: Type.STRING, description: "The stock ticker symbol." }
      },
      required: ["ticker"]
    }
  },
  {
    name: "create_dossier",
    description: "Create and display a comprehensive intelligence dossier on a person or company. Use this before meetings.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the person or company" },
        role: { type: Type.STRING, description: "Their current title/role" },
        company: { type: Type.STRING, description: "The company they are associated with" },
        recentNews: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    source: { type: Type.STRING },
                    date: { type: Type.STRING }
                }
            },
            description: "3-4 recent news headlines found via search."
        },
        lastInteraction: { type: Type.STRING, description: "A summary of the last interaction from user notes." }
      },
      required: ["name", "role", "company", "recentNews", "lastInteraction"]
    }
  },
  {
    name: "create_strategy_memo",
    description: "Create a structured post-meeting strategy memo. Analyzes raw thoughts into Risks, Decisions, and Action Items.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title of the memo (e.g., 'Board Meeting Debrief')" },
        risks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key risks identified" },
        decisions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Decisions made" },
        actionItems: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT, 
                properties: {
                    task: { type: Type.STRING },
                    assignee: { type: Type.STRING },
                    dueDate: { type: Type.STRING }
                }
            }, 
            description: "Actionable tasks with owners and dates" 
        }
      },
      required: ["title", "risks", "decisions", "actionItems"]
    }
  }
];
