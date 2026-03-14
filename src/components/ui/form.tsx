"use client";

import * as React from "react";
import {
    Controller,
    FormProvider,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
    name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
    {} as FormFieldContextValue,
);

const FormField = <
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) => {
    return (
        <FormFieldContext.Provider value={{ name: props.name }}>
            <Controller {...props} />
        </FormFieldContext.Provider>
    );
};

type FormItemContextValue = {
    id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
    {} as FormItemContextValue,
);

const FormItem = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
    ({ className, ...props }, ref) => {
        const id = React.useId();

        return (
            <FormItemContext.Provider value={{ id }}>
                <div ref={ref} className={cn("space-y-2", className)} {...props} />
            </FormItemContext.Provider>
        );
    },
);

FormItem.displayName = "FormItem";

function useFormField() {
    const fieldContext = React.useContext(FormFieldContext);
    const itemContext = React.useContext(FormItemContext);

    return {
        id: itemContext.id,
        name: fieldContext.name,
        formItemId: `${itemContext.id}-item`,
        formDescriptionId: `${itemContext.id}-description`,
        formMessageId: `${itemContext.id}-message`,
    };
}

const FormLabel = React.forwardRef<
    HTMLLabelElement,
    React.ComponentProps<typeof Label>
>(({ className, ...props }, ref) => {
    const { formItemId } = useFormField();

    return (
        <Label ref={ref} className={cn(className)} htmlFor={formItemId} {...props} />
    );
});

FormLabel.displayName = "FormLabel";

const FormControl = ({ children }: { children: React.ReactNode }) => {
    const { formItemId, formDescriptionId, formMessageId } = useFormField();

    if (!React.isValidElement(children)) {
        return null;
    }

    const child = children as React.ReactElement<Record<string, unknown>>;

    return React.cloneElement(child, {
        id: formItemId,
        "aria-describedby": `${formDescriptionId} ${formMessageId}`,
    });
};

const FormDescription = React.forwardRef<
    HTMLParagraphElement,
    React.ComponentProps<"p">
>(({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();

    return (
        <p
            ref={ref}
            id={formDescriptionId}
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    );
});

FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
    HTMLParagraphElement,
    React.ComponentProps<"p">
>(({ className, ...props }, ref) => {
    const { formMessageId } = useFormField();

    if (!props.children) {
        return null;
    }

    return (
        <p
            ref={ref}
            id={formMessageId}
            className={cn("text-sm text-destructive", className)}
            {...props}
        />
    );
});

FormMessage.displayName = "FormMessage";

export {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
};
