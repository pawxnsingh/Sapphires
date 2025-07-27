import { CardWrapper } from "@/components/auth/CardWrapper";

export const ErrorCard = () => {
  return (
    <CardWrapper
      backButtonLabel="Back to login"
      backButtonHref="/auth/login"
      headerLabel="Oops! Something went wrong!"
    >
      {``}
    </CardWrapper>
  );
};
