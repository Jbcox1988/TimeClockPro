import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Delete, RotateCcw, Clock, Settings } from "lucide-react";

interface PinKeypadProps {
  onPinSubmit: (pin: string) => void;
  onAdminClick: () => void;
  loading?: boolean;
}

export function PinKeypad({ onPinSubmit, onAdminClick, loading }: PinKeypadProps) {
  const [pin, setPin] = useState("");
  const maxPinLength = 6;

  const handleKeyPress = (key: string) => {
    if (key === "clear") {
      setPin("");
    } else if (key === "backspace") {
      setPin(prev => prev.slice(0, -1));
    } else if (pin.length < maxPinLength) {
      setPin(prev => prev + key);
    }
  };

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onPinSubmit(pin);
      setPin("");
    }
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < maxPinLength; i++) {
      dots.push(
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-colors duration-200 ${
            i < pin.length
              ? "bg-primary border-primary"
              : "border-gray-300 dark:border-gray-600"
          }`}
        />
      );
    }
    return dots;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Enter Your PIN
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Enter your 4-6 digit employee PIN
          </p>
        </div>

        {/* PIN Display */}
        <div className="mb-6">
          <div className="flex justify-center space-x-3 mb-4">
            {renderPinDots()}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Row 1: 1, 2, 3 */}
          {[1, 2, 3].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              className="h-16 text-2xl font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 touch-manipulation transition-all duration-200"
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
            >
              {num}
            </Button>
          ))}
          
          {/* Row 2: 4, 5, 6 */}
          {[4, 5, 6].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              className="h-16 text-2xl font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 touch-manipulation transition-all duration-200"
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
            >
              {num}
            </Button>
          ))}
          
          {/* Row 3: 7, 8, 9 */}
          {[7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              className="h-16 text-2xl font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 touch-manipulation transition-all duration-200"
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
            >
              {num}
            </Button>
          ))}
          
          {/* Row 4: Clear, 0, Backspace */}
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-sm font-semibold bg-destructive hover:bg-red-600 text-white border-2 border-red-500 touch-manipulation transition-all duration-200"
            onClick={() => handleKeyPress("clear")}
            disabled={loading}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Clear
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-2xl font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 touch-manipulation transition-all duration-200"
            onClick={() => handleKeyPress("0")}
            disabled={loading}
          >
            0
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="h-16 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-500 touch-manipulation transition-all duration-200"
            onClick={() => handleKeyPress("backspace")}
            disabled={loading}
          >
            <Delete className="w-5 h-5" style={{ color: 'white' }} />
          </Button>
        </div>

        {/* Login Button */}
        <Button
          className="w-full h-14 text-lg font-semibold touch-manipulation"
          onClick={handleSubmit}
          disabled={pin.length < 4 || loading}
        >
          <Clock className="w-5 h-5 mr-2" />
          {loading ? "Logging in..." : "Log In"}
        </Button>


      </CardContent>
    </Card>
  );
}
