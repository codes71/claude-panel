import { Card, CardContent, Skeleton, Box } from "@mui/material";

interface LoadingCardProps {
  height?: number;
  lines?: number;
}

export default function LoadingCard({ height, lines = 3 }: LoadingCardProps) {
  return (
    <Card sx={{ height }}>
      <CardContent>
        <Skeleton variant="text" width="60%" sx={{ mb: 1, fontSize: "1.1rem" }} />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            width={i === lines - 1 ? "40%" : "100%"}
            sx={{ mb: 0.5 }}
          />
        ))}
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rounded" width={80} height={28} />
        </Box>
      </CardContent>
    </Card>
  );
}
