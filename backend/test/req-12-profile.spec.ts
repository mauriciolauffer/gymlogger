import { describe, expect, it, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../src/index";

describe("REQ-12: User Profile Setup", () => {
  let token: string;

  beforeEach(async () => {
    const regRes = await app.request(
      "/api/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Taylor Athlete",
          email: "taylor@example.com",
          password: "password123",
        }),
      },
      env,
    );
    const data = await regRes.json();
    token = data.token;
  });

  it("fetches initial user profile details", async () => {
    const res = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.email).toBe("taylor@example.com");
    expect(data.profile.name).toBe("Taylor Athlete");
  });

  it("updates profile information successfully and persists", async () => {
    const updateRes = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location: "New York, USA",
          birthday: "1995-06-15",
          sex: "female",
          height: 172,
          height_unit: "cm",
          bio: "Powerlifter and fitness enthusiast.",
        }),
      },
      env,
    );

    expect(updateRes.status).toBe(200);
    const data = await updateRes.json();
    expect(data.message).toBe("Profile updated successfully");
    expect(data.profile.location).toBe("New York, USA");
    expect(data.profile.sex).toBe("female");
    expect(data.profile.height).toBe(172);
    expect(data.profile.bio).toBe("Powerlifter and fitness enthusiast.");

    const fetchRes = await app.request(
      "/api/v1/users/profile",
      { headers: { Authorization: `Bearer ${token}` } },
      env,
    );
    const fetch = await fetchRes.json();
    expect(fetch.profile.location).toBe("New York, USA");
    expect(fetch.profile.height).toBe(172);
  });

  it("validates invalid profile update fields", async () => {
    const resInvalidSex = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sex: "invalid_sex" }),
      },
      env,
    );
    expect(resInvalidSex.status).toBe(400);

    const resInvalidHeight = await app.request(
      "/api/v1/users/profile",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ height: -10 }),
      },
      env,
    );
    expect(resInvalidHeight.status).toBe(400);
  });
});
