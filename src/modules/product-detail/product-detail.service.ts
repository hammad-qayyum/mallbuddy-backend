import prisma from "../../config/prisma";
import {
  CreateProductVariationInput,
  UpdateProductVariationInput,
  CreateVariationOptionInput,
  UpdateVariationOptionInput,
  CreateProductAddOnInput,
  UpdateProductAddOnInput,
  CreateAddOnOptionInput,
  UpdateAddOnOptionInput,
} from "./product-detail.schema";

export const productDetailService = {
  // ============ GET PRODUCT DETAIL ============
  /**
   * Get complete product detail with all variations and add-ons
   * @param menuItemId - The menu item ID to fetch details for
   * @returns Complete product information with variations and add-ons
   */
  async getProductDetail(menuItemId: string) {
    const product = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: {
          include: {
            restaurant: true,
          },
        },
        variations: {
          include: {
            options: {
              orderBy: { displayOrder: "asc" },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
        addOns: {
          include: {
            options: {
              orderBy: { displayOrder: "asc" },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  },

  // ============ PRODUCT VARIATION CRUD ============
  /**
   * Create a new product variation (e.g., Size, Crust Type)
   */
  async createVariation(data: CreateProductVariationInput) {
    // Verify menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: data.menuItemId },
    });
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    return prisma.productVariation.create({
      data,
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: true,
      },
    });
  },

  /**
   * Get all variations for a product
   */
  async getVariationsByProduct(menuItemId: string) {
    return prisma.productVariation.findMany({
      where: { menuItemId },
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });
  },

  /**
   * Get a specific variation
   */
  async getVariationById(variationId: string) {
    return prisma.productVariation.findUnique({
      where: { id: variationId },
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  },

  /**
   * Update a product variation
   */
  async updateVariation(variationId: string, data: UpdateProductVariationInput) {
    const variation = await prisma.productVariation.findUnique({
      where: { id: variationId },
    });
    if (!variation) {
      throw new Error("Variation not found");
    }

    return prisma.productVariation.update({
      where: { id: variationId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: true,
      },
    });
  },

  /**
   * Delete a product variation (cascades to options)
   */
  async deleteVariation(variationId: string) {
    const variation = await prisma.productVariation.findUnique({
      where: { id: variationId },
    });
    if (!variation) {
      throw new Error("Variation not found");
    }

    return prisma.productVariation.delete({
      where: { id: variationId },
    });
  },

  // ============ VARIATION OPTION CRUD ============
  /**
   * Create a variation option (e.g., Small - 0.00, Large - 2.50)
   */
  async createVariationOption(data: CreateVariationOptionInput) {
    // Verify variation exists
    const variation = await prisma.productVariation.findUnique({
      where: { id: data.variationId },
    });
    if (!variation) {
      throw new Error("Variation not found");
    }

    return prisma.variationOption.create({
      data,
      include: {
        variation: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Get all options for a variation
   */
  async getVariationOptions(variationId: string) {
    return prisma.variationOption.findMany({
      where: { variationId },
      include: {
        variation: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });
  },

  /**
   * Get a specific variation option
   */
  async getVariationOptionById(optionId: string) {
    return prisma.variationOption.findUnique({
      where: { id: optionId },
      include: {
        variation: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Update a variation option
   */
  async updateVariationOption(optionId: string, data: UpdateVariationOptionInput) {
    const option = await prisma.variationOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new Error("Variation option not found");
    }

    return prisma.variationOption.update({
      where: { id: optionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.priceModifier !== undefined && { priceModifier: data.priceModifier }),
      },
      include: {
        variation: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Delete a variation option
   */
  async deleteVariationOption(optionId: string) {
    const option = await prisma.variationOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new Error("Variation option not found");
    }

    return prisma.variationOption.delete({
      where: { id: optionId },
    });
  },

  // ============ PRODUCT ADD-ON CRUD ============
  /**
   * Create a new product add-on (e.g., Extra Toppings)
   */
  async createAddOn(data: CreateProductAddOnInput) {
    // Verify menu item exists
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: data.menuItemId },
    });
    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    return prisma.productAddOn.create({
      data,
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: true,
      },
    });
  },

  /**
   * Get all add-ons for a product
   */
  async getAddOnsByProduct(menuItemId: string) {
    return prisma.productAddOn.findMany({
      where: { menuItemId },
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });
  },

  /**
   * Get a specific add-on
   */
  async getAddOnById(addOnId: string) {
    return prisma.productAddOn.findUnique({
      where: { id: addOnId },
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  },

  /**
   * Update a product add-on
   */
  async updateAddOn(addOnId: string, data: UpdateProductAddOnInput) {
    const addOn = await prisma.productAddOn.findUnique({
      where: { id: addOnId },
    });
    if (!addOn) {
      throw new Error("Add-on not found");
    }

    return prisma.productAddOn.update({
      where: { id: addOnId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.maxSelection !== undefined && { maxSelection: data.maxSelection }),
      },
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                restaurant: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        options: true,
      },
    });
  },

  /**
   * Delete a product add-on (cascades to options)
   */
  async deleteAddOn(addOnId: string) {
    const addOn = await prisma.productAddOn.findUnique({
      where: { id: addOnId },
    });
    if (!addOn) {
      throw new Error("Add-on not found");
    }

    return prisma.productAddOn.delete({
      where: { id: addOnId },
    });
  },

  // ============ ADD-ON OPTION CRUD ============
  /**
   * Create an add-on option (e.g., Pickled red cabbage - 0.50)
   */
  async createAddOnOption(data: CreateAddOnOptionInput) {
    // Verify add-on exists
    const addOn = await prisma.productAddOn.findUnique({
      where: { id: data.addOnId },
    });
    if (!addOn) {
      throw new Error("Add-on not found");
    }

    return prisma.addOnOption.create({
      data,
      include: {
        addOn: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Get all options for an add-on
   */
  async getAddOnOptions(addOnId: string) {
    return prisma.addOnOption.findMany({
      where: { addOnId },
      include: {
        addOn: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });
  },

  /**
   * Get a specific add-on option
   */
  async getAddOnOptionById(optionId: string) {
    return prisma.addOnOption.findUnique({
      where: { id: optionId },
      include: {
        addOn: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Update an add-on option
   */
  async updateAddOnOption(optionId: string, data: UpdateAddOnOptionInput) {
    const option = await prisma.addOnOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new Error("Add-on option not found");
    }

    return prisma.addOnOption.update({
      where: { id: optionId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.price !== undefined && { price: data.price }),
      },
      include: {
        addOn: {
          include: {
            menuItem: {
              include: {
                category: {
                  include: {
                    restaurant: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  /**
   * Delete an add-on option
   */
  async deleteAddOnOption(optionId: string) {
    const option = await prisma.addOnOption.findUnique({
      where: { id: optionId },
    });
    if (!option) {
      throw new Error("Add-on option not found");
    }

    return prisma.addOnOption.delete({
      where: { id: optionId },
    });
  },
};
