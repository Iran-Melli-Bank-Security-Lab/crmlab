import React from "react";
import { Field, NativeSelect, type NativeSelectFieldProps } from "@chakra-ui/react";

type SelectProps = NativeSelectFieldProps & {
  label?: string;
  error?: React.ReactNode;
  children: React.ReactNode;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, name, id, ...props }, ref) => {
    const selectId = id || String(name || label || "select");
    return (
      <Field.Root invalid={Boolean(error)}>
        {label && <Field.Label htmlFor={selectId}>{label}</Field.Label>}
        <NativeSelect.Root>
          <NativeSelect.Field
            id={selectId}
            name={name}
            ref={ref}
            borderRadius="md"
            bg="var(--apple-surface)"
            borderColor="var(--apple-border)"
            color="var(--apple-text)"
            _hover={{ borderColor: "var(--apple-border)" }}
            _focusVisible={{
              borderColor: "var(--apple-blue)",
              boxShadow: "var(--focus-ring)",
            }}
            {...props}
          >
            {children}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        {error && <Field.ErrorText>{error}</Field.ErrorText>}
      </Field.Root>
    );
  }
);

Select.displayName = "Select";
export default Select;
