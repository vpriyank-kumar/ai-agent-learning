const tickets = [
    {
      id: "SW-123",
      title: "Email delivery issue",
      status: "In Progress",
      priority: "High",
      comments: [
        {
          author: "John Doe",
          text: "Investigating the email delivery issue.",
        },
        {
          author: "Jane Smith",
          text: "The issue appears to affect some campaign emails.",
        },
      ],
    },
    {
      id: "SW-456",
      title: "Campaign not sending",
      status: "Open",
      priority: "Medium",
      comments: [
        {
          author: "Mike Johnson",
          text: "Waiting for additional logs from the customer.",
        },
      ],
    },
    {
      id: "SW-789",
      title: "Login issue",
      status: "Resolved",
      priority: "Low",
      comments: [
        {
          author: "Sarah Wilson",
          text: "The login issue was fixed and verified.",
        },
      ],
    },
  ];
  
  export function getTicketComments(ticketId) {
    const ticket = tickets.find(
      (ticket) => ticket.id.toLowerCase() === ticketId.toLowerCase()
    );
  
    if (!ticket) {
      return {
        found: false,
        message: `Ticket ${ticketId} was not found.`,
      };
    }
  
    return {
      found: true,
      ticketId: ticket.id,
      comments: ticket.comments || [],
    };
  }
  
  export function searchTickets(searchText) {
    const normalizedSearchText = normalizeText(searchText);
  
    const matchingTickets = tickets.filter((ticket) => {
      const searchableText = [
        ticket.id,
        ticket.title,
        ticket.status,
        ticket.priority,
      ]
        .map(normalizeText)
        .join(" ");
  
      return searchableText.includes(normalizedSearchText);
    });
  
    return {
      count: matchingTickets.length,
      tickets: matchingTickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
      })),
    };
  }
  
  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .replace(/s$/, "");
  }
  
  export function getTicket(ticketId) {
    const ticket = tickets.find(
      (ticket) => ticket.id.toLowerCase() === ticketId.toLowerCase()
    );
  
    if (!ticket) {
      return {
        found: false,
        message: `Ticket ${ticketId} was not found.`,
      };
    }
  
    return {
      found: true,
      ticket,
    };
  }