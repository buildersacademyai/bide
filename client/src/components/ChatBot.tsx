[\s\S]*?```)/);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('