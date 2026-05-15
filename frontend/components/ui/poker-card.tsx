import * as React from "react";
import { cn } from "@/lib/utils";

interface PokerCardProps {
  card: string;
  isRevealed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const PokerCard = React.forwardRef<HTMLDivElement, PokerCardProps>(
  ({ card, isRevealed = true, size = "md", className, onClick }, ref) => {
    // Parse card string (e.g., "♠️A", "♥️K", "♦️10", "♣️2")
    const isHidden = card === "🂠" || !isRevealed;

    if (isHidden) {
      return (
        <div
          ref={ref}
          className={cn(
            "card cursor-pointer",
            size === "sm" && "w-20 h-28",
            size === "md" && "w-24 h-36",
            size === "lg" && "w-28 h-40",
            className
          )}
          onClick={onClick}
        >
          <div className="card-inner is-flipped">
            <div className="card-face card-front"></div>
            <div className="card-face card-back">
              <img alt="Card Back" src="/cards/Back.png" />
            </div>
          </div>
        </div>
      );
    }

    // Extract suit and rank from backend format
    // Backend sends cards like "♠️A", "♥️K", "♦️10", "♣️2"
    let suit = "";
    let rank = "";

    if (card && card.length >= 2) {
      // Handle emoji suits (2 characters) + rank
      if (
        card.startsWith("♠️") ||
        card.startsWith("♥️") ||
        card.startsWith("♦️") ||
        card.startsWith("♣️")
      ) {
        suit = card.slice(0, 2); // Get emoji (2 chars)
        rank = card.slice(2); // Get rank (remaining chars)
      } else {
        // Fallback: assume first char is suit
        suit = card.charAt(0);
        rank = card.slice(1);
      }
    }

    // Map backend suits to file names
    const suitMap: Record<
      string,
      { key: string; name: string; file: string; color: string }
    > = {
      "♣️": {
        key: "clubs",
        name: "Club",
        file: "/cards/Club.png",
        color: "black",
      },
      "♦️": {
        key: "diamonds",
        name: "Diamond",
        file: "/cards/Diamond.png",
        color: "red",
      },
      "♥️": {
        key: "hearts",
        name: "Heart",
        file: "/cards/Heart.png",
        color: "red",
      },
      "♠️": {
        key: "spades",
        name: "Spade",
        file: "/cards/Spade.png",
        color: "black",
      },
    };

    const suitInfo = suitMap[suit];
    if (!suitInfo) {
      console.log("Invalid card debug:", {
        card,
        suit,
        rank,
        suitKeys: Object.keys(suitMap),
      });
      return (
        <div className="card">
          <div className="card-inner">
            <div className="card-face card-front bg-red-100 flex items-center justify-center text-xs">
              Invalid: {card}
            </div>
          </div>
        </div>
      );
    }

    // Determine card type and artwork
    const isNumberCard = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ].includes(rank);
    const isFaceCard = ["J", "Q", "K"].includes(rank);
    const isAce = rank === "A";

    let artSrc = "";
    let cornerRank: { type: string; text?: string; src?: string } = {
      type: "text",
      text: rank,
    };

    if (isAce) {
      // Ace cards have special artwork
      const aceArtMap: Record<string, string> = {
        clubs: "/cards/Ace Club.png",
        diamonds: "/cards/Ace Diamond.png",
        hearts: "/cards/Ace Heart.png",
        spades: "/cards/Ace Spade.png",
      };
      artSrc = aceArtMap[suitInfo.key];
      cornerRank = { type: "text", text: "A" };
    } else if (isFaceCard) {
      // Face cards
      const faceMap: Record<string, string> = {
        J: "Jack",
        Q: "Queen",
        K: "King",
      };
      artSrc = `/cards/${faceMap[rank]} ${suitInfo.name}.png`;
      cornerRank = { type: "text", text: rank };
    } else if (isNumberCard) {
      // Number cards use pip layout
      const numberFileMap: Record<string, string> = {
        "2": "/cards/Two.png",
        "3": "/cards/Three.png",
        "4": "/cards/Four.png",
        "5": "/cards/Five.png",
        "6": "/cards/Six.png",
        "7": "/cards/Seven.png",
        "8": "/cards/Eight.png",
        "9": "/cards/Nine.png",
        "10": "/cards/Ten.png",
      };
      cornerRank = { type: "image", src: numberFileMap[rank] };
    }

    // Pip layouts for number cards
    const pipLayouts: Record<string, [number, number][]> = {
      "2": [
        [2, 2],
        [4, 2],
      ],
      "3": [
        [1, 2],
        [3, 2],
        [5, 2],
      ],
      "4": [
        [2, 1],
        [2, 3],
        [4, 1],
        [4, 3],
      ],
      "5": [
        [1, 1],
        [1, 3],
        [3, 2],
        [5, 1],
        [5, 3],
      ],
      "6": [
        [1, 1],
        [1, 3],
        [3, 1],
        [3, 3],
        [5, 1],
        [5, 3],
      ],
      "7": [
        [1, 1],
        [1, 3],
        [2, 2],
        [3, 1],
        [3, 3],
        [5, 1],
        [5, 3],
      ],
      "8": [
        [1, 1],
        [1, 3],
        [2, 2],
        [3, 1],
        [3, 3],
        [4, 2],
        [5, 1],
        [5, 3],
      ],
      "9": [
        [1, 1],
        [1, 3],
        [2, 1],
        [2, 3],
        [3, 2],
        [4, 1],
        [4, 3],
        [5, 1],
        [5, 3],
      ],
      "10": [
        [1, 1],
        [1, 3],
        [2, 1],
        [2, 2],
        [2, 3],
        [3, 1],
        [3, 3],
        [4, 1],
        [4, 3],
      ],
    };

    return (
      <div
        ref={ref}
        className={cn(
          "card cursor-pointer",
          size === "sm" && "w-20 h-28",
          size === "md" && "w-24 h-36",
          size === "lg" && "w-28 h-40",
          className
        )}
        data-rank={rank}
        data-suit={suitInfo.key}
        onClick={onClick}
      >
        <div className="card-inner">
          <div className="card-face card-front">
            {/* Corner - only for non-face cards */}
            {!isFaceCard && (
              <div className="corner">
                {cornerRank.type === "image" && cornerRank.src ? (
                  <img className="rank-img" alt={rank} src={cornerRank.src} />
                ) : (
                  <span className={`rank-text ${suitInfo.color}`}>
                    {cornerRank.text}
                  </span>
                )}
                <img
                  className="suit-icon"
                  alt={suitInfo.name}
                  src={suitInfo.file}
                />
              </div>
            )}

            {/* Central art */}
            <div className={cn("art", isFaceCard && "face", isAce && "ace")}>
              {isNumberCard ? (
                <div
                  className="pips"
                  style={{
                    display: "grid",
                    gridTemplateRows: "repeat(5, 1fr)",
                    gridTemplateColumns: "repeat(3, 1fr)",
                  }}
                >
                  {pipLayouts[rank]?.map(([r, c], index) => (
                    <img
                      key={index}
                      className="pip"
                      alt={suitInfo.name}
                      src={suitInfo.file}
                      style={{ gridRow: r, gridColumn: c }}
                    />
                  ))}
                </div>
              ) : (
                <img alt={`${rank} of ${suitInfo.name}`} src={artSrc} />
              )}
            </div>
          </div>

          <div className="card-face card-back">
            <img alt="Card Back" src="/cards/Back.png" />
          </div>
        </div>
      </div>
    );
  }
);

PokerCard.displayName = "PokerCard";

export { PokerCard };
