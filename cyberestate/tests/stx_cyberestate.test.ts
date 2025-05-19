import { describe, expect, it } from "vitest";

describe("Play-to-Earn Gaming Protocol", () => {
  // Mock implementation of the contract's state
  let mockState = {
    owner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    gameToken: {
      balances: {}
    },
    achievements: {},
    playerAchievements: {},
    gameAdmins: {}
  };
  
  // Mock implementations of contract functions
  const contract = {
    // Constants
    constants: {
      contractOwner: mockState.owner,
      errOwnerOnly: { err: 100 },
      errNotFound: { err: 101 },
      errAchievementExists: { err: 102 },
      errUnauthorized: { err: 103 },
      errInvalidAmount: { err: 104 },
      errAlreadyClaimed: { err: 105 }
    },
    
    // Read-only functions
    getTokenBalance: (account) => {
      return { ok: mockState.gameToken.balances[account] || 0 };
    },
    
    getAchievement: (achievementId) => {
      if (mockState.achievements[achievementId]) {
        return { ok: mockState.achievements[achievementId] };
      }
      return contract.constants.errNotFound;
    },
    
    checkAchievementClaimed: (player, achievementId) => {
      const key = `${player}-${achievementId}`;
      if (mockState.playerAchievements[key]) {
        return { ok: mockState.playerAchievements[key].claimed };
      }
      return { ok: false };
    },
    
    checkIsAdmin: (account) => {
      return { ok: !!mockState.gameAdmins[account] };
    },
    
    // Public functions
    initializeTokenSupply: (amount, sender) => {
      if (sender !== mockState.owner) {
        return contract.constants.errOwnerOnly;
      }
      
      mockState.gameToken.balances[mockState.owner] = (mockState.gameToken.balances[mockState.owner] || 0) + amount;
      return { ok: true };
    },
    
    addGameAdmin: (admin, sender) => {
      if (sender !== mockState.owner) {
        return contract.constants.errOwnerOnly;
      }
      
      mockState.gameAdmins[admin] = true;
      return { ok: true };
    },
    
    removeGameAdmin: (admin, sender) => {
      if (sender !== mockState.owner) {
        return contract.constants.errOwnerOnly;
      }
      
      mockState.gameAdmins[admin] = false;
      return { ok: true };
    },
    
    addAchievement: (achievementId, name, description, rewardAmount, sender) => {
      if (sender !== mockState.owner && !mockState.gameAdmins[sender]) {
        return contract.constants.errUnauthorized;
      }
      
      if (mockState.achievements[achievementId]) {
        return contract.constants.errAchievementExists;
      }
      
      mockState.achievements[achievementId] = {
        name,
        description,
        rewardAmount,
        active: true
      };
      
      return { ok: true };
    },
    
    updateAchievement: (achievementId, name, description, rewardAmount, active, sender) => {
      if (sender !== mockState.owner && !mockState.gameAdmins[sender]) {
        return contract.constants.errUnauthorized;
      }
      
      if (!mockState.achievements[achievementId]) {
        return contract.constants.errNotFound;
      }
      
      mockState.achievements[achievementId] = {
        name,
        description,
        rewardAmount,
        active
      };
      
      return { ok: true };
    },
    
    awardAchievement: (player, achievementId, sender) => {
      if (sender !== mockState.owner && !mockState.gameAdmins[sender]) {
        return contract.constants.errUnauthorized;
      }
      
      const achievement = mockState.achievements[achievementId];
      if (!achievement || !achievement.active) {
        return contract.constants.errNotFound;
      }
      
      const key = `${player}-${achievementId}`;
      if (mockState.playerAchievements[key] && mockState.playerAchievements[key].claimed) {
        return contract.constants.errAlreadyClaimed;
      }
      
      mockState.playerAchievements[key] = { claimed: true };
      
      // Transfer reward tokens to player
      mockState.gameToken.balances[mockState.owner] = (mockState.gameToken.balances[mockState.owner] || 0) - achievement.rewardAmount;
      mockState.gameToken.balances[player] = (mockState.gameToken.balances[player] || 0) + achievement.rewardAmount;
      
      return { ok: true };
    },
    
    withdrawTokens: (amount, recipient, sender) => {
      if (sender !== mockState.owner) {
        return contract.constants.errOwnerOnly;
      }
      
      if (amount <= 0) {
        return contract.constants.errInvalidAmount;
      }
      
      mockState.gameToken.balances[mockState.owner] = (mockState.gameToken.balances[mockState.owner] || 0) - amount;
      mockState.gameToken.balances[recipient] = (mockState.gameToken.balances[recipient] || 0) + amount;
      
      return { ok: true };
    },
    
    getPlayerStats: (player) => {
      return {
        ok: {
          tokenBalance: mockState.gameToken.balances[player] || 0
        }
      };
    },
    
    transferBetweenPlayers: (amount, sender, recipient) => {
      if (amount <= 0) {
        return contract.constants.errInvalidAmount;
      }
      
      if ((mockState.gameToken.balances[sender] || 0) < amount) {
        return { err: 1 }; // Not enough tokens
      }
      
      mockState.gameToken.balances[sender] = (mockState.gameToken.balances[sender] || 0) - amount;
      mockState.gameToken.balances[recipient] = (mockState.gameToken.balances[recipient] || 0) + amount;
      
      return { ok: true };
    },
    
    adminTransferBetweenPlayers: (amount, sender, recipient, admin) => {
      if (admin !== mockState.owner && !mockState.gameAdmins[admin]) {
        return contract.constants.errUnauthorized;
      }
      
      if (amount <= 0) {
        return contract.constants.errInvalidAmount;
      }
      
      mockState.gameToken.balances[sender] = (mockState.gameToken.balances[sender] || 0) - amount;
      mockState.gameToken.balances[recipient] = (mockState.gameToken.balances[recipient] || 0) + amount;
      
      return { ok: true };
    },
    
    // Functions specific to player achievement awards
    awardAchievementToPlayer1: (achievementId, player) => {
      return contract.awardAchievement(player, achievementId, player);
    },
    
    awardAchievementToPlayer2: (player, achievementId, sender) => {
      if (sender !== mockState.owner && !mockState.gameAdmins[sender]) {
        return contract.constants.errUnauthorized;
      }
      return contract.awardAchievement(player, achievementId, sender);
    }
  };
  
  // Helper function to reset state between tests
  const resetState = () => {
    mockState = {
      owner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
      gameToken: {
        balances: {}
      },
      achievements: {},
      playerAchievements: {},
      gameAdmins: {}
    };
  };

  // Test suite for initialization and admin functions
  describe("Initialization and Admin Management", () => {
    beforeEach(() => {
      resetState();
    });

    it("should initialize token supply when called by owner", () => {
      const result = contract.initializeTokenSupply(1000, mockState.owner);
      expect(result).toEqual({ ok: true });
      expect(mockState.gameToken.balances[mockState.owner]).toBe(1000);
    });

    it("should reject token initialization when not called by owner", () => {
      const nonOwner = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const result = contract.initializeTokenSupply(1000, nonOwner);
      expect(result).toEqual(contract.constants.errOwnerOnly);
    });

    it("should add a game admin when called by owner", () => {
      const admin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const result = contract.addGameAdmin(admin, mockState.owner);
      expect(result).toEqual({ ok: true });
      expect(mockState.gameAdmins[admin]).toBe(true);
    });

    it("should remove a game admin when called by owner", () => {
      const admin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      
      // First add the admin
      contract.addGameAdmin(admin, mockState.owner);
      expect(mockState.gameAdmins[admin]).toBe(true);
      
      // Then remove the admin
      const result = contract.removeGameAdmin(admin, mockState.owner);
      expect(result).toEqual({ ok: true });
      expect(mockState.gameAdmins[admin]).toBe(false);
    });
  });

  // Test suite for achievement management
  describe("Achievement Management", () => {
    const admin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
    
    beforeEach(() => {
      resetState();
      contract.addGameAdmin(admin, mockState.owner);
    });

    it("should add a new achievement when called by owner", () => {
      const result = contract.addAchievement(
        1, 
        "First Win", 
        "Win your first game", 
        100, 
        mockState.owner
      );
      
      expect(result).toEqual({ ok: true });
      expect(mockState.achievements[1]).toEqual({
        name: "First Win",
        description: "Win your first game",
        rewardAmount: 100,
        active: true
      });
    });

    it("should add a new achievement when called by admin", () => {
      const result = contract.addAchievement(
        1, 
        "First Win", 
        "Win your first game", 
        100, 
        admin
      );
      
      expect(result).toEqual({ ok: true });
      expect(mockState.achievements[1]).toEqual({
        name: "First Win",
        description: "Win your first game",
        rewardAmount: 100,
        active: true
      });
    });

    it("should reject adding an achievement that already exists", () => {
      // First add the achievement
      contract.addAchievement(1, "First Win", "Win your first game", 100, mockState.owner);
      
      // Try to add it again
      const result = contract.addAchievement(1, "Duplicate", "Should fail", 50, mockState.owner);
      expect(result).toEqual(contract.constants.errAchievementExists);
    });

    it("should update an existing achievement", () => {
      // First add the achievement
      contract.addAchievement(1, "First Win", "Win your first game", 100, mockState.owner);
      
      // Update the achievement
      const result = contract.updateAchievement(
        1,
        "Updated Achievement",
        "Updated description",
        200,
        false,
        mockState.owner
      );
      
      expect(result).toEqual({ ok: true });
      expect(mockState.achievements[1]).toEqual({
        name: "Updated Achievement",
        description: "Updated description",
        rewardAmount: 200,
        active: false
      });
    });
  });

  // Test suite for achievement awards and token transfers
  describe("Achievement Awards and Token Transfers", () => {
    const admin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
    const player1 = "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0";
    const player2 = "ST31DA6FTSJX2WGTZ69SFY11BH51NZMB0ZZ239N96";
    
    beforeEach(() => {
      resetState();
      contract.addGameAdmin(admin, mockState.owner);
      contract.initializeTokenSupply(10000, mockState.owner);
      contract.addAchievement(1, "First Win", "Win your first game", 100, mockState.owner);
      contract.addAchievement(2, "Champion", "Win 10 games", 500, mockState.owner);
    });

    it("should award an achievement to a player", () => {
      const result = contract.awardAchievement(player1, 1, mockState.owner);
      
      expect(result).toEqual({ ok: true });
      expect(mockState.playerAchievements[`${player1}-1`].claimed).toBe(true);
      expect(mockState.gameToken.balances[player1]).toBe(100);
      expect(mockState.gameToken.balances[mockState.owner]).toBe(9900);
    });

    it("should not award an inactive achievement", () => {
      // Deactivate the achievement
      contract.updateAchievement(1, "First Win", "Win your first game", 100, false, mockState.owner);
      
      const result = contract.awardAchievement(player1, 1, mockState.owner);
      expect(result).toEqual(contract.constants.errNotFound);
    });

    it("should not award an achievement that was already claimed", () => {
      // First award the achievement
      contract.awardAchievement(player1, 1, mockState.owner);
      
      // Try to award it again
      const result = contract.awardAchievement(player1, 1, mockState.owner);
      expect(result).toEqual(contract.constants.errAlreadyClaimed);
    });

    it("should allow the owner to withdraw tokens", () => {
      const result = contract.withdrawTokens(1000, player1, mockState.owner);
      
      expect(result).toEqual({ ok: true });
      expect(mockState.gameToken.balances[player1]).toBe(1000);
      expect(mockState.gameToken.balances[mockState.owner]).toBe(9000);
    });

    it("should allow players to transfer tokens between them", () => {
      // First award some tokens to player1
      contract.awardAchievement(player1, 1, mockState.owner);
      
      // Transfer tokens from player1 to player2
      const result = contract.transferBetweenPlayers(50, player1, player2);
      
      expect(result).toEqual({ ok: true });
      expect(mockState.gameToken.balances[player1]).toBe(50);
      expect(mockState.gameToken.balances[player2]).toBe(50);
    });

    it("should allow admin to transfer tokens between players", () => {
      // First award some tokens to player1
      contract.awardAchievement(player1, 1, mockState.owner);
      
      // Admin transfers tokens from player1 to player2
      const result = contract.adminTransferBetweenPlayers(50, player1, player2, admin);
      
      expect(result).toEqual({ ok: true });
      expect(mockState.gameToken.balances[player1]).toBe(50);
      expect(mockState.gameToken.balances[player2]).toBe(50);
    });
    
    it("should test player-specific achievement award functions", () => {
      // Test awardAchievementToPlayer1
      const result1 = contract.awardAchievementToPlayer1(1, player1);
      expect(result1).toEqual({ ok: true });
      
      // Test awardAchievementToPlayer2
      const result2 = contract.awardAchievementToPlayer2(player2, 2, admin);
      expect(result2).toEqual({ ok: true });
      expect(mockState.gameToken.balances[player2]).toBe(500);
    });
  });

  // Test suite for player statistics and read-only functions
  describe("Player Statistics and Read-Only Functions", () => {
    const player = "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0";
    
    beforeEach(() => {
      resetState();
      contract.initializeTokenSupply(10000, mockState.owner);
      contract.addAchievement(1, "First Win", "Win your first game", 100, mockState.owner);
      contract.awardAchievement(player, 1, mockState.owner);
    });

    it("should get token balance for an account", () => {
      const result = contract.getTokenBalance(player);
      expect(result).toEqual({ ok: 100 });
    });

    it("should get achievement details", () => {
      const result = contract.getAchievement(1);
      expect(result).toEqual({
        ok: {
          name: "First Win",
          description: "Win your first game",
          rewardAmount: 100,
          active: true
        }
      });
    });

    it("should check if an achievement is claimed", () => {
      const result = contract.checkAchievementClaimed(player, 1);
      expect(result).toEqual({ ok: true });
    });

    it("should get player stats", () => {
      const result = contract.getPlayerStats(player);
      expect(result).toEqual({
        ok: {
          tokenBalance: 100
        }
      });
    });
    
    it("should return not found for non-existent achievement", () => {
      const result = contract.getAchievement(999);
      expect(result).toEqual(contract.constants.errNotFound);
    });
  });
  
  // Additional test suite for edge cases
  describe("Edge Cases and Error Handling", () => {
    const player = "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0";
    
    beforeEach(() => {
      resetState();
      contract.initializeTokenSupply(10000, mockState.owner);
    });
    
    it("should reject withdrawing zero or negative tokens", () => {
      const result = contract.withdrawTokens(0, player, mockState.owner);
      expect(result).toEqual(contract.constants.errInvalidAmount);
    });
    
    it("should reject transferring tokens with insufficient balance", () => {
      const sender = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const result = contract.transferBetweenPlayers(100, sender, player);
      expect(result).toEqual({ err: 1 });
    });
    
    it("should reject unauthorized admin operations", () => {
      const nonAdmin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
      const result = contract.addAchievement(1, "Test", "Test", 100, nonAdmin);
      expect(result).toEqual(contract.constants.errUnauthorized);
    });
  });
});