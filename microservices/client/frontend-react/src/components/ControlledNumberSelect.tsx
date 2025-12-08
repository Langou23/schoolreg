
interface ControlledNumberSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  required?: boolean;
  label?: string;
  suffix?: string;
}

/**
 * Composant de sélection contrôlée pour les nombres
 * Remplace les inputs type="number" par des selects avec valeurs prédéfinies
 */
export default function ControlledNumberSelect({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  placeholder = "Sélectionner",
  className = "",
  required = false,
  label,
  suffix = ""
}: ControlledNumberSelectProps) {
  
  // Générer les options basées sur min, max et step
  const generateOptions = () => {
    const options = [];
    for (let i = min; i <= max; i += step) {
      options.push(i);
    }
    return options;
  };

  const options = generateOptions();

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map(num => (
          <option key={num} value={num}>
            {num}{suffix}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Variante pour les montants d'argent avec centimes
 */
export function ControlledMoneySelect({
  value,
  onChange,
  min = 0,
  max = 10000,
  step = 50,
  currency = "CAD",
  placeholder = "Sélectionner un montant",
  className = "",
  required = false,
  label
}: Omit<ControlledNumberSelectProps, 'suffix'> & { currency?: string }) {
  
  // Générer les options de montants
  const generateMoneyOptions = (): number[] => {
    const options: number[] = [];
    // Montants courants
    const commonAmounts = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000];
    
    commonAmounts.forEach(amount => {
      if (amount >= min && amount <= max) {
        options.push(amount);
      }
    });
    
    return options.sort((a, b) => a - b);
  };

  const options: number[] = generateMoneyOptions();

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      >
        <option value="">{placeholder}</option>
        {options.map(amount => (
          <option key={amount} value={amount}>
            {amount.toLocaleString('fr-CA')} $ {currency}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Variante pour les capacités de classe (1-50)
 */
export function ControlledCapacitySelect({
  value,
  onChange,
  min = 1,
  max = 50,
  placeholder = "Sélectionner la capacité",
  className = "",
  required = false,
  label = "Capacité"
}: Omit<ControlledNumberSelectProps, 'suffix' | 'step'>) {
  
  return (
    <ControlledNumberSelect
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      step={1}
      placeholder={placeholder}
      className={className}
      required={required}
      label={label}
      suffix=" élèves"
    />
  );
}
