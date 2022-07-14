class Route {
  constructor(event) {
    this.event = event;
  }

  async handle() {
    console.log("Route 3 processing event.");

    return {
      statusCode: 200,
      headers: {},
      body: "route 3",
    };
  }
}

module.exports.route = async (event) => {
  const route = new Route(event);
  return await route.handle();
};
